/**
 * Runs before page routes render (so status codes are still ours to set):
 *
 * 1. API unreachable → **503** with Retry-After and a short "can't reach the service" page, instead of
 *    a 200 that monitors, crawlers and browsers would treat as a working page. White-label: no product
 *    name on it. Uses the per-host cache the pages use, so it costs no API call while the API is up.
 * 2. Owner-only and platform-only pages (lib/page-rules.ts) → **404** for anyone else, decided from the
 *    session's role before the page renders (lib/page-guard.ts).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { isBlocked } from '@/lib/page-guard';
import { fetchHostContext, resolveHost } from '@/lib/tenant-cache';

const UNAVAILABLE_HTML = `<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Temporarily unavailable</title><style>
:root{color-scheme:dark light;--bg:#0b0d12;--fg:#e8eaf0;--muted:#9aa1b2;--card:#141821;--border:#232a36}
@media (prefers-color-scheme:light){:root{--bg:#f6f7f9;--fg:#11141a;--muted:#5b6475;--card:#fff;--border:#e3e6ec}}
*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:420px;text-align:center}svg{width:40px;height:40px;color:var(--muted)}h1{font-size:1.25rem;margin:16px 0 8px}p{margin:0 0 20px;color:var(--muted)}
a{display:inline-block;padding:8px 16px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--fg);text-decoration:none;font-weight:500}
</style></head><body><main><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/></svg>
<h1>We can't reach the service right now</h1><p>This is usually brief. Please refresh the page in a minute.</p><a href="">Try again</a></main></body></html>`;

export async function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost';
  const ctx = await resolveHost(host, () => fetchHostContext(host, req.headers));
  if (ctx.scope === 'unavailable') {
    return new NextResponse(UNAVAILABLE_HTML, {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'retry-after': '30' },
    });
  }
  if ((ctx.scope === 'gym' || ctx.scope === 'platform') && (await isBlocked(req, ctx.scope))) {
    // Renders the app's own "Page not found" with a 404 status; the address bar keeps the URL.
    return NextResponse.rewrite(new URL('/page-not-found', req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Pages only: not the /api proxy (it reports API_UNAVAILABLE itself), assets, or the design preview.
  matcher: ['/((?!api/|_next/|design-preview|favicon\\.ico|.*\\.[a-z0-9]+$).*)'],
};
