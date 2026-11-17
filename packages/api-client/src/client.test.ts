import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createApiClient } from './client.ts';

type Call = { url: string; method: string; headers: Record<string, string>; body?: string };
type Reply = { status: number; body?: unknown };

/** Fake fetch: records calls; replies from a per-URL queue (or a function). */
function fakeFetch(routes: Record<string, Reply[] | ((c: Call) => Reply)>) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: RequestInit) => {
    const call: Call = { url, method: init.method!, headers: init.headers as Record<string, string>, body: init.body as string | undefined };
    calls.push(call);
    const path = url.split('?')[0]!;
    const r = routes[path];
    const reply = typeof r === 'function' ? r(call) : r?.shift();
    if (!reply) throw new Error(`no reply for ${path}`);
    return new Response(reply.status === 204 ? null : JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
}

const user = { id: 'u1', name: 'Rahul', email: 'o@x', phone: null, role: 'owner' as const, status: 'active', permissions: ['dashboard:read'] };
const session = (t: string) => ({ success: true, data: { accessToken: t, tokenType: 'Bearer', expiresIn: 900, user } });
const err = (status: number, code: string) => ({ status, body: { success: false, error: { code, message: code, requestId: 'r1' } } });

test('login stores the token in memory and sends it as a bearer token', async () => {
  const { calls, fetch } = fakeFetch({
    '/api/v1/auth/login': [{ status: 200, body: session('A') }],
    '/api/v1/dashboard': [{ status: 200, body: { success: true, data: { ok: 1 } } }],
  });
  const seen: (string | null)[] = [];
  const api = createApiClient({ fetch, onSessionChange: (s) => seen.push(s?.accessToken ?? null) });
  await api.login('owner@x', 'pw');
  const r = await api.get('/api/v1/dashboard');
  assert.deepEqual(r.data, { ok: 1 });
  assert.equal(calls[1]!.headers.Authorization, 'Bearer A');
  assert.equal(calls[0]!.headers.Authorization, undefined);
  assert.deepEqual(seen, ['A']);
});

test('TOKEN_EXPIRED refreshes once and retries with the same idempotency key', async () => {
  let n = 0;
  const { calls, fetch } = fakeFetch({
    '/api/v1/auth/login': [{ status: 200, body: session('A') }],
    '/api/v1/auth/refresh': [{ status: 200, body: session('B') }],
    '/api/v1/memberships/m1/payments': () => (n++ === 0 ? err(401, 'TOKEN_EXPIRED') : { status: 201, body: { success: true, data: { id: 'p1' } } }),
  });
  const api = createApiClient({ fetch });
  await api.login('o', 'p');
  await api.post('/api/v1/memberships/{id}/payments', {
    params: { id: 'm1' },
    body: { amountPaise: 100, method: 'cash' },
    idempotencyKey: true,
  });
  const pays = calls.filter((c) => c.url.endsWith('/payments'));
  assert.equal(pays.length, 2);
  assert.equal(pays[1]!.headers.Authorization, 'Bearer B');
  assert.ok(pays[0]!.headers['Idempotency-Key']);
  assert.equal(pays[0]!.headers['Idempotency-Key'], pays[1]!.headers['Idempotency-Key']);
});

test('parallel expired calls share a single refresh', async () => {
  const { calls, fetch } = fakeFetch({
    '/api/v1/auth/login': [{ status: 200, body: session('A') }],
    '/api/v1/auth/refresh': [{ status: 200, body: session('B') }],
    '/api/v1/dashboard': (c) => (c.headers.Authorization === 'Bearer A' ? err(401, 'TOKEN_EXPIRED') : { status: 200, body: { success: true, data: 1 } }),
  });
  const api = createApiClient({ fetch });
  await api.login('o', 'p');
  await Promise.all([api.get('/api/v1/dashboard'), api.get('/api/v1/dashboard'), api.get('/api/v1/dashboard')]);
  assert.equal(calls.filter((c) => c.url.endsWith('/refresh')).length, 1);
});

test('REFRESH_RACE is retried, INVALID_REFRESH signs out', async () => {
  const { fetch } = fakeFetch({ '/api/v1/auth/refresh': [err(401, 'REFRESH_RACE'), { status: 200, body: session('C') }] });
  const api = createApiClient({ fetch, raceDelayMs: () => 0 });
  assert.equal((await api.refresh()).accessToken, 'C');

  const f2 = fakeFetch({ '/api/v1/auth/refresh': [err(401, 'INVALID_REFRESH')] });
  let last: unknown = 'unset';
  const api2 = createApiClient({ fetch: f2.fetch, onSessionChange: (s) => (last = s) });
  await assert.rejects(api2.refresh(), (e) => e instanceof ApiError && e.code === 'INVALID_REFRESH');
  assert.equal(last, null);
  assert.equal(api2.session, null);
});

test('impersonation tokens are not refreshed: expiry ends the session', async () => {
  const { calls, fetch } = fakeFetch({ '/api/v1/dashboard': [err(401, 'TOKEN_EXPIRED')] });
  const api = createApiClient({ fetch });
  api.adoptImpersonation('IMP', user, 900);
  await assert.rejects(api.get('/api/v1/dashboard'), (e) => e instanceof ApiError && e.code === 'TOKEN_EXPIRED');
  assert.equal(calls.some((c) => c.url.endsWith('/refresh')), false);
  assert.equal(api.session, null);
});

test('errors carry code, request id and field errors; query skips empty values', async () => {
  const { calls, fetch } = fakeFetch({
    '/api/v1/members': [{ status: 422, body: { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid', requestId: 'rq', details: [{ path: ['phone'], message: 'Too short' }] } } }],
  });
  const api = createApiClient({ fetch });
  await assert.rejects(api.get('/api/v1/members', { query: { q: 'ra', page: 2, sort: undefined } }), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.code, 'VALIDATION_ERROR');
    assert.equal(e.requestId, 'rq');
    assert.deepEqual(e.fieldErrors(), { phone: 'Too short' });
    return true;
  });
  assert.equal(calls[0]!.url, '/api/v1/members?q=ra&page=2');
});

test('network failure becomes NETWORK_ERROR', async () => {
  const api = createApiClient({ fetch: (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch });
  await assert.rejects(api.get('/api/v1/auth/me'), (e) => e instanceof ApiError && e.code === 'NETWORK_ERROR');
});

// Compile-time checks (never executed): the generated spec rejects wrong bodies and unknown paths.
export function _typeChecks(api: ReturnType<typeof createApiClient>) {
  // @ts-expect-error identifier is required
  void api.post('/api/v1/auth/login', { body: { password: 'x' } });
  // @ts-expect-error not an API path
  void api.get('/api/v1/nope');
  // @ts-expect-error method not supported on this path
  void api.delete('/api/v1/dashboard');
  void api.get('/api/v1/dashboard').then((r) => r.data.members.active satisfies number);
}
