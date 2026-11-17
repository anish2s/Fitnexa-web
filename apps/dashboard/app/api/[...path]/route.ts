/**
 * Same-origin proxy: /api/* → the backend API.
 *
 * The browser only ever talks to its own host (powerhouse.yourapp.in), so the refresh cookie stays
 * host-only and there is no CORS. The backend identifies the gym from X-Forwarded-Host, which it
 * honours only when TRUST_PROXY counts this hop (TRUST_PROXY=1 locally, 2 behind Cloudflare + Next).
 * Origin and Sec-Fetch-Site pass through untouched for the backend's CSRF check on /auth/refresh.
 */
import type { NextRequest } from 'next/server';
import { API_URL } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Hop-by-hop and recomputed headers are not forwarded.
const DROP_REQUEST = new Set([
  'host', 'connection', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding',
  'upgrade', 'content-length', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port',
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
  headers.set('x-forwarded-host', host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

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
      { status: 502 },
    );
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key)) out.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
