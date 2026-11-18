/**
 * Headers this server sends to the API on behalf of a visitor (page renders and the /api proxy).
 *
 * The API counts rate limits per IP. Every call reaches it from this server, so without the visitor's
 * IP all visitors would share one allowance. We work out the IP from our own trusted hops and
 * **overwrite** X-Forwarded-For with it, so whatever the visitor sent is never passed on. The API
 * honours the header only from this server's address (backend TRUST_PROXY).
 */
import { isIP } from 'node:net';
import { TRUSTED_PROXY_HOPS } from './env';

/**
 * The visitor's IP from X-Forwarded-For as this server received it.
 *
 * With `hops` proxies in front, each appended the address it was connected from, so the visitor is
 * `hops` entries from the right; anything further left was supplied by the visitor and is ignored.
 * With no proxy (hops = 0) Next.js fills the header with the connecting address.
 */
export function clientIp(xForwardedFor: string | null | undefined, hops = TRUSTED_PROXY_HOPS): string | undefined {
  const chain = (xForwardedFor ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const candidate = chain[chain.length - Math.max(1, hops)];
  if (!candidate) return undefined;
  const ip = candidate.replace(/^\[(.*)\]$/, '$1'); // "[2001:db8::1]"
  return isIP(ip) ? ip : undefined;
}

/** X-Forwarded-* for an API call made for this request. */
export function forwardedHeaders(incoming: Headers, proto?: string): Record<string, string> {
  const out: Record<string, string> = {
    'x-forwarded-host': incoming.get('host') ?? 'localhost',
    'x-forwarded-proto': proto ?? incoming.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'http',
  };
  const ip = clientIp(incoming.get('x-forwarded-for'));
  if (ip) out['x-forwarded-for'] = ip;
  return out;
}
