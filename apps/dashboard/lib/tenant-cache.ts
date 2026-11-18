/**
 * Host → site (gym / platform / unknown / API down), from GET /public/tenant.
 *
 * Each host's answer is kept in this server's memory for 60 seconds (the API's own Cache-Control),
 * so page loads don't each cost an API call. Owner and platform edits made through this server's
 * /api proxy drop entries at once (`invalidateTenantCache`); with several server instances the others
 * catch up within the minute. "API down" is never cached. Shared by pages and proxy.ts, so it has no
 * request-scoped imports.
 */
import type { PublicTenant } from '@fitexaa/api-client';
import { API_URL } from './env';
import { forwardedHeaders } from './forwarding';

export type HostContext =
  | { scope: 'gym'; host: string; tenant: PublicTenant }
  | { scope: 'platform'; host: string }
  | { scope: 'not_found'; host: string }
  | { scope: 'unavailable'; host: string };

export const TENANT_CACHE_TTL_MS = 60_000;
/** Bound on distinct hosts kept (random subdomains can't grow memory without limit). */
const TENANT_CACHE_MAX = 500;

type Entry = { at: number; ctx: Promise<HostContext> };
// On globalThis: route handlers and pages may load separate copies of this module.
const g = globalThis as typeof globalThis & { __fxTenantCache?: Map<string, Entry> };
const store = (g.__fxTenantCache ??= new Map<string, Entry>());

/** Forget cached gym details: one host, or all (platform edits can touch any gym). */
export function invalidateTenantCache(host?: string): void {
  if (host === undefined) store.clear();
  else store.delete(host.toLowerCase());
}

/** Host → site, cached per host; concurrent misses for one host share a single API call. */
export async function resolveHost(
  host: string,
  fetchTenant: () => Promise<HostContext>,
  now: number = Date.now(),
): Promise<HostContext> {
  const key = host.toLowerCase();
  const hit = store.get(key);
  if (hit && now - hit.at < TENANT_CACHE_TTL_MS) return hit.ctx;
  const ctx = fetchTenant();
  store.delete(key);
  store.set(key, { at: now, ctx });
  if (store.size > TENANT_CACHE_MAX) store.delete(store.keys().next().value!); // oldest first
  const settled = await ctx;
  if (settled.scope === 'unavailable' && store.get(key)?.ctx === ctx) store.delete(key);
  return settled;
}

export async function fetchHostContext(host: string, incoming: Headers): Promise<HostContext> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/public/tenant`, {
      headers: { accept: 'application/json', ...forwardedHeaders(incoming) },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return { scope: 'unavailable', host };
  }
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: PublicTenant }
    | { success: false; error: { code: string } }
    | null;
  if (json?.success) return { scope: 'gym', host, tenant: json.data };
  const code = json && !json.success ? json.error.code : undefined;
  if (code === 'TENANT_REQUIRED') return { scope: 'platform', host };
  if (code === 'TENANT_NOT_FOUND') return { scope: 'not_found', host };
  return { scope: 'unavailable', host }; // 5xx, 429, or not JSON
}

