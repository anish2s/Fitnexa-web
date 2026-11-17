/**
 * Server-side: which site is this request for? Resolved once per request from the Host header via
 * GET /public/tenant, so the very first paint already carries the gym's name, colour and theme.
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { PublicTenant, Theme } from '@fitnexa/api-client';
import { API_URL, REFRESH_COOKIES, THEME_COOKIE } from './env';

export type HostContext =
  | { scope: 'gym'; host: string; tenant: PublicTenant }
  | { scope: 'platform'; host: string }
  | { scope: 'not_found'; host: string }
  | { scope: 'unavailable'; host: string };

export const getHostContext = cache(async (): Promise<HostContext> => {
  const h = await headers();
  const host = h.get('host') ?? 'localhost';
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/public/tenant`, {
      headers: { accept: 'application/json', 'x-forwarded-host': host, 'x-forwarded-proto': h.get('x-forwarded-proto') ?? 'http' },
      cache: 'no-store',
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
  return { scope: 'unavailable', host };
});

/** The theme to render on the server: the viewer's saved choice, else the gym's default. */
export async function getInitialTheme(ctx: HostContext): Promise<{ theme: 'dark' | 'light'; followSystem: boolean }> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  if (saved === 'dark' || saved === 'light') return { theme: saved, followSystem: false };
  const pref: Theme = ctx.scope === 'gym' ? ctx.tenant.branding.defaultTheme : 'dark';
  if (pref === 'system') return { theme: 'dark', followSystem: true };
  return { theme: pref, followSystem: false };
}

/** Whether the browser holds a refresh cookie (presence only), so signed-out visitors skip a refresh call. */
export async function hasRefreshCookie(): Promise<boolean> {
  const jar = await cookies();
  return REFRESH_COOKIES.some((n) => jar.has(n));
}
