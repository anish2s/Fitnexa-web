/**
 * Server-side page guards by role, run in proxy.ts before anything renders (on top of the API's own
 * checks, which stay the real enforcement). Blocked pages answer 404, like an unknown page.
 *
 * The role comes from GET /auth/session: the API reads the HttpOnly refresh cookie without using it
 * up. Without a usable cookie the page is let through: the client shell then shows sign-in, and a
 * "log in as owner" support tab (token in memory only, no cookie by design) still works.
 *
 * The answer is remembered per cookie for 30 seconds: Next.js prefetches menu links (Staff, Audit
 * log) on every page view, and each prefetch passes through here. The cookie changes on every
 * refresh, so a cached role never outlives the session it came from by more than that.
 */
import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { API_URL, REFRESH_COOKIES } from './env';
import { forwardedHeaders } from './forwarding';
import { allowed, ruleFor, type SessionRole } from './page-rules';

const ROLE_TTL_MS = 30_000;
const ROLE_CACHE_MAX = 1_000;
type Entry = { at: number; role: Promise<SessionRole | null> };
const g = globalThis as typeof globalThis & { __fxRoleCache?: Map<string, Entry> };
const roles = (g.__fxRoleCache ??= new Map<string, Entry>());

/** Who holds this request's refresh cookie; null if nobody (or unknown: API unreachable). */
export async function sessionRole(req: NextRequest, now = Date.now()): Promise<SessionRole | null> {
  const name = REFRESH_COOKIES.find((n) => req.cookies.has(n));
  if (!name) return null;
  const value = req.cookies.get(name)!.value;
  const key = createHash('sha256').update(value).digest('base64url'); // never keep the token itself
  const hit = roles.get(key);
  if (hit && now - hit.at < ROLE_TTL_MS) return hit.role;
  const role = askApi(req, name, value);
  roles.set(key, { at: now, role });
  if (roles.size > ROLE_CACHE_MAX) roles.delete(roles.keys().next().value!);
  const settled = await role;
  if (!settled && roles.get(key)?.role === role) roles.delete(key); // only remember real answers
  return settled;
}

async function askApi(req: NextRequest, name: string, value: string): Promise<SessionRole | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/session`, {
      headers: {
        accept: 'application/json',
        cookie: `${name}=${value}`, // only the refresh cookie, nothing else
        ...forwardedHeaders(req.headers),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: SessionRole };
    return json.data ?? null;
  } catch {
    return null;
  }
}

/** True when this page must not be shown to this visitor on this site. */
export async function isBlocked(req: NextRequest, site: 'gym' | 'platform'): Promise<boolean> {
  const rule = ruleFor(req.nextUrl.pathname);
  if (!rule) return false;
  if (!allowed(rule, site, null)) return true; // wrong host: no need to ask who it is
  return !allowed(rule, site, await sessionRole(req));
}
