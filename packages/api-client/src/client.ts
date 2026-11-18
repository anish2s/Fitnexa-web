/**
 * Fitnexa API client.
 *
 * - Talks to the same origin (`/api/v1/...`); the Next.js app proxies to the backend and forwards the
 *   host so the backend knows which gym this is.
 * - The access token lives only in this closure (memory). It is never written to storage.
 * - The refresh token is an HttpOnly cookie the browser sends to `/auth/refresh`; scripts never see it.
 * - On `TOKEN_EXPIRED` the client refreshes once (one refresh in flight per client) and retries.
 *   `REFRESH_RACE` (another tab refreshed first) is retried after a short pause.
 * - Unwraps the `{ success, data, meta }` envelope; failures throw `ApiError` with the backend's code.
 */
import type { paths } from './schema';
import type { Me, PageMeta, ResponseMap, Session } from './responses';
import type { JsonBody, Method, PathParamsOf, PathsWith, QueryOf } from './typed-paths';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(status: number, code: string, message: string, details?: unknown, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Field errors from a 422 VALIDATION_ERROR, keyed by path ("address.city"). */
  fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const d of this.details as { path?: unknown; message?: unknown }[]) {
      const path = Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? '');
      if (path && typeof d.message === 'string' && !out[path]) out[path] = d.message;
    }
    return out;
  }
}

/** Network failure or a non-JSON reply (e.g. the API is down behind the proxy). */
export const NETWORK_ERROR = 'NETWORK_ERROR';

/** Response `data` for a path + method, from ResponseMap (unknown if not mapped yet). */
export type ResponseOf<P, M extends Method> = `${M} ${P & string}` extends keyof ResponseMap
  ? ResponseMap[`${M} ${P & string}`]
  : unknown;

/** Page meta plus endpoint extras (`totals`, `until`, `date`…). */
export type Meta = Partial<PageMeta> & Record<string, unknown>;

export interface ApiResult<T, M = Meta> {
  data: T;
  meta: M | undefined;
  status: number;
}

export interface RequestOptions<P extends keyof paths, M extends Method> {
  params?: PathParamsOf<P, M>;
  query?: QueryOf<P, M>;
  body?: JsonBody<P, M>;
  /** A non-JSON body sent as-is, e.g. a CSV file for `POST /members/import`. */
  rawBody?: { contentType: string; data: string };
  /**
   * Money-recording calls need an Idempotency-Key. `true` generates one for this call; pass a
   * string to reuse a key across user-initiated retries of the same intended payment.
   */
  idempotencyKey?: string | true;
  /** Send the bearer token (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  /** Prefix for requests. '' = same origin (browser). Server code passes the backend URL. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Extra headers on every request (server-side: X-Forwarded-Host). */
  headers?: Record<string, string>;
  /** Called whenever the in-memory session changes (sign-in, refresh, sign-out). */
  onSessionChange?: (session: Session | null) => void;
  /** Pause before retrying a REFRESH_RACE; injectable for tests. */
  raceDelayMs?: () => number;
}

interface InternalRequest {
  method: string;
  url: string;
  body?: unknown;
  rawBody?: { contentType: string; data: string };
  auth: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export function createApiClient(opts: ApiClientOptions = {}) {
  const baseUrl = opts.baseUrl ?? '';
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const raceDelay = opts.raceDelayMs ?? (() => 150 + Math.random() * 250);

  let session: Session | null = null;
  /** Impersonation tokens can't be refreshed (no cookie); expiry simply ends the session. */
  let refreshable = true;
  let refreshing: Promise<Session> | null = null;

  function setSession(next: Session | null, canRefresh = true) {
    session = next;
    refreshable = canRefresh;
    opts.onSessionChange?.(next);
  }

  async function send(req: InternalRequest): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (req.rawBody) headers['Content-Type'] = req.rawBody.contentType;
    else if (req.body !== undefined) headers['Content-Type'] = 'application/json';
    if (req.auth && session) headers.Authorization = `Bearer ${session.accessToken}`;
    if (req.idempotencyKey) headers['Idempotency-Key'] = req.idempotencyKey;
    try {
      return await doFetch(baseUrl + req.url, {
        method: req.method,
        headers,
        body: req.rawBody ? req.rawBody.data : req.body === undefined ? undefined : JSON.stringify(req.body),
        credentials: 'include',
        signal: req.signal,
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') throw err;
      throw new ApiError(0, NETWORK_ERROR, 'Could not reach the server. Check your connection and try again.');
    }
  }

  async function parse<T, M>(res: Response): Promise<ApiResult<T, M>> {
    if (res.status === 204) return { data: undefined as T, meta: undefined, status: 204 };
    let json: { success?: boolean; data?: T; meta?: M; error?: { code: string; message: string; details?: unknown; requestId?: string } };
    try {
      json = await res.json();
    } catch {
      throw new ApiError(res.status, NETWORK_ERROR, 'The server sent an unexpected reply. Please try again.');
    }
    if (!res.ok || json.success === false) {
      const e = json.error;
      throw new ApiError(res.status, e?.code ?? 'INTERNAL_ERROR', e?.message ?? 'Something went wrong', e?.details, e?.requestId);
    }
    return { data: json.data as T, meta: json.meta, status: res.status };
  }

  async function refreshOnce(): Promise<Session> {
    for (let attempt = 0; ; attempt++) {
      try {
        const { data } = await parse<Session, never>(await send({ method: 'POST', url: '/api/v1/auth/refresh', auth: false }));
        setSession(data, true);
        return data;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'REFRESH_RACE' && attempt < 3) {
          await new Promise((r) => setTimeout(r, raceDelay()));
          continue;
        }
        if (err instanceof ApiError && err.status === 401) setSession(null);
        throw err;
      }
    }
  }

  /** Exchange the refresh cookie for a new session. Concurrent callers share one request. */
  function refresh(): Promise<Session> {
    refreshing ??= refreshOnce().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function run<T, M>(req: InternalRequest): Promise<ApiResult<T, M>> {
    // Wait for a refresh already in flight so we don't send a token that is about to be replaced.
    if (req.auth && refreshing) await refreshing.catch(() => undefined);
    try {
      return await parse<T, M>(await send(req));
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== 'TOKEN_EXPIRED' || !req.auth) throw err;
      if (!refreshable) {
        setSession(null);
        throw err;
      }
      await refresh();
      return parse<T, M>(await send(req)); // same Idempotency-Key on the retry
    }
  }

  function buildUrl(path: string, params?: Record<string, unknown>, query?: Record<string, unknown>) {
    let url = path.replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = params?.[k];
      if (v === undefined || v === null || v === '') throw new Error(`Missing path param "${k}" for ${path}`);
      return encodeURIComponent(String(v));
    });
    if (query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === '') continue;
        qs.append(k, String(v));
      }
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    return url;
  }

  function call<M extends Method>(method: M) {
    return <P extends PathsWith<M>>(path: P, o: RequestOptions<P, M> = {}): Promise<ApiResult<ResponseOf<P, M>>> =>
      run<ResponseOf<P, M>, Meta>({
        method: method.toUpperCase(),
        url: buildUrl(path as string, o.params as Record<string, unknown>, o.query as Record<string, unknown>),
        body: o.body,
        rawBody: o.rawBody,
        auth: o.auth ?? true,
        idempotencyKey: o.idempotencyKey === true ? newIdempotencyKey() : o.idempotencyKey,
        signal: o.signal,
      });
  }

  const api = {
    get: call('get'),
    post: call('post'),
    put: call('put'),
    patch: call('patch'),
    delete: call('delete'),

    /** Current in-memory session, if signed in. */
    get session() {
      return session;
    },
    refresh,

    async login(identifier: string, password: string): Promise<Session> {
      const { data } = await api.post('/api/v1/auth/login', { body: { identifier, password }, auth: false });
      setSession(data, true);
      return data;
    },

    /** Ends this device's session; always clears local state, even if the server call fails. */
    async logout(): Promise<void> {
      try {
        await api.post('/api/v1/auth/logout', { auth: false });
      } finally {
        setSession(null);
      }
    },

    me: (): Promise<Me> => api.get('/api/v1/auth/me').then((r) => r.data),

    /**
     * Fetches a file the API serves directly (e.g. a PDF receipt) with the bearer token, refreshing
     * once on TOKEN_EXPIRED like any other call. Errors come back as ApiError from the JSON body.
     */
    async download<P extends PathsWith<'get'>>(path: P, o: { params?: PathParamsOf<P, 'get'>; signal?: AbortSignal } = {}): Promise<Blob> {
      const url = buildUrl(path as string, o.params as Record<string, unknown>);
      const fetchOnce = () =>
        doFetch(baseUrl + url, {
          headers: { ...opts.headers, ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}) },
          credentials: 'include',
          signal: o.signal,
        }).catch((err: unknown) => {
          if ((err as { name?: string }).name === 'AbortError') throw err;
          throw new ApiError(0, NETWORK_ERROR, 'Could not reach the server. Check your connection and try again.');
        });
      if (refreshing) await refreshing.catch(() => undefined);
      let res = await fetchOnce();
      if (res.status === 401 && refreshable) {
        const body = await res.clone().json().catch(() => null);
        if (body?.error?.code === 'TOKEN_EXPIRED') {
          await refresh();
          res = await fetchOnce();
        }
      }
      if (!res.ok) await parse(res); // throws the ApiError
      return res.blob();
    },

    /** Use a token handed over by the platform console ("log in as owner"). Not refreshable. */
    adoptImpersonation(token: string, user: Session['user'], expiresIn: number) {
      setSession({ accessToken: token, tokenType: 'Bearer', expiresIn, user }, false);
    },

    /** Forget the session locally (e.g. another tab signed out). */
    clear() {
      setSession(null);
    },
  };
  return api;
}

export type ApiClient = ReturnType<typeof createApiClient>;

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
