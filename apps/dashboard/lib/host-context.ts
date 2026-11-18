/**
 * Server-side: which site is this request for? Resolved from the Host header (cached per host, see
 * tenant-cache.ts), so the very first paint already carries the gym's name, colour and theme.
 */
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import type { Theme } from '@fitnexa/api-client';
import { REFRESH_COOKIES, THEME_COOKIE } from './env';
import { fetchHostContext, resolveHost, type HostContext } from './tenant-cache';

export type { HostContext } from './tenant-cache';

/** Once per request (React cache), from the per-host cache. */
export const getHostContext = cache(async (): Promise<HostContext> => {
  const h = await headers();
  const host = h.get('host') ?? 'localhost';
  return resolveHost(host, () => fetchHostContext(host, h));
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
