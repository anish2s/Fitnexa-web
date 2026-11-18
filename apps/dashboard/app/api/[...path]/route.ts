/**
 * Same-origin proxy: /api/* → the backend API.
 *
 * The browser only ever talks to its own host (powerhouse.yourapp.in), so the refresh cookie stays
 * host-only and there is no CORS. We overwrite X-Forwarded-Host (the gym) and X-Forwarded-For (the
 * visitor's IP, for per-visitor rate limits; lib/forwarding.ts); whatever the browser sent in those
 * is dropped. The backend honours them only from this server's address (its TRUST_PROXY).
 * Origin and Sec-Fetch-Site pass through untouched for the backend's CSRF check on /auth/refresh.
 */
import type { NextRequest } from 'next/server';
import { API_URL } from '@/lib/env';
import { forwardedHeaders } from '@/lib/forwarding';
import { invalidateTenantCache } from '@/lib/tenant-cache';

export const dynamic = 'force-dynamic';

// Hop-by-hop and recomputed headers are not forwarded.
const DROP_REQUEST = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding',
  'upgrade', 'content-length', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port',
  // Client-supplied forwarding headers are never passed on; we set our own.
  'x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip', 'true-client-ip',
]);
const DROP_RESPONSE = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length', 'set-cookie',
]);

async function proxy(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const host = req.headers.get('host') ?? url.host;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key)) headers.set(key, value);
  });
  for (const [k, v] of Object.entries(forwardedHeaders(req.headers, url.protocol.replace(':', '')))) headers.set(k, v);
  headers.set('x-forwarded-host', host);

  const init: RequestInit & { duplex?: 'half' } = { method: req.method, headers, redirect: 'manual', cache: 'no-store' };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(API_URL + url.pathname + url.search, init);
  } catch {
    return Response.json(
      { success: false, error: { code: 'API_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again shortly.' } },
      { status: 503, headers: { 'retry-after': '30' } },
    );
  }

  // Gym name/branding/status changed: page renders must not keep serving the cached copy.
  if (req.method !== 'GET' && upstream.ok) {
    if (url.pathname.startsWith('/api/v1/platform/tenants')) invalidateTenantCache();
    else if (url.pathname === '/api/v1/gym' || url.pathname === '/api/v1/gym/branding') invalidateTenantCache(host);
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key)) out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
