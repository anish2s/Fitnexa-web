/**
 * GET /gym-icon?s=32|48|180|192|512&v=…  — the fallback icon for a gym without an app icon or logo:
 * the first letter of its name, in a readable colour on its brand colour (same contrast rule as the
 * app's buttons). Gym hosts only; the gym comes from the Host header via the 60-second per-host cache,
 * so this costs no API call while the cache is warm.
 */
import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { readableOn } from '@fitexaa/ui/brand';
import { fetchHostContext, resolveHost } from '@/lib/tenant-cache';
import { LETTER_ICON_SIZES, letterIconUrl } from '@/lib/icons';

export async function GET(req: Request) {
  const h = await headers();
  const host = h.get('host') ?? 'localhost';
  const ctx = await resolveHost(host, () => fetchHostContext(host, h));
  if (ctx.scope !== 'gym') return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });

  const url = new URL(req.url);
  const asked = Number(url.searchParams.get('s'));
  const size = (LETTER_ICON_SIZES as readonly number[]).includes(asked) ? asked : 32;
  const { name, branding } = ctx.tenant;
  const letter = ([...name.trim()][0] ?? '?').toLocaleUpperCase('en-IN');
  const bg = branding.primaryColor;

  // A `v` matching the current name and colour can be cached for good (it changes when they do);
  // anything else is only cached briefly.
  const current = new URL(letterIconUrl(ctx.tenant, size), url).searchParams.get('v');
  const cacheControl = url.searchParams.get('v') === current ? 'public, max-age=31536000, immutable' : 'public, max-age=300';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          color: readableOn(bg),
          borderRadius: size >= 180 ? 0 : Math.round(size * 0.2),
          fontSize: Math.round(size * 0.62),
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {letter}
      </div>
    ),
    { width: size, height: size, headers: { 'cache-control': cacheControl, vary: 'Host' } },
  );
}
