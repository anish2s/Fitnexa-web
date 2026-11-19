/**
 * GET /favicon.ico — browsers ask for it on their own (bookmarks, tabs opened without our <link>s).
 * Sends each host to its own icon so a gym host never gets Fitexaa's: gym → its sized app icon /
 * logo / letter icon, platform → the Fitexaa icon, anything else → 404. A short-lived redirect, so
 * an icon change shows up quickly.
 */
import { headers } from 'next/headers';
import { fetchHostContext, resolveHost } from '@/lib/tenant-cache';
import { gymIcons, PLATFORM_ICONS } from '@/lib/icons';

export async function GET() {
  const h = await headers();
  const host = h.get('host') ?? 'localhost';
  const ctx = await resolveHost(host, () => fetchHostContext(host, h));
  const target = ctx.scope === 'gym' ? gymIcons(ctx.tenant).icon[1]!.url : ctx.scope === 'platform' ? PLATFORM_ICONS.icon[1]!.url : null;
  if (!target) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(null, {
    status: 302,
    headers: { location: target, 'cache-control': 'public, max-age=300', vary: 'Host' },
  });
}
