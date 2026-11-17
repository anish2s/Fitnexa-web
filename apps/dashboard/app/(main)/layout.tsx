import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { brandVars } from '@fitnexa/ui';
import { FITNEXA_ACCENT } from '@/lib/env';
import { getHostContext, getInitialTheme, hasRefreshCookie } from '@/lib/host-context';
import { Providers } from '@/components/providers';
import { SiteProblem } from '@/components/site-problem';
import '../globals.css';

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

/** White-label: gym hosts are titled with the gym's name only; Fitnexa appears on the platform host. */
export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getHostContext();
  const site = ctx.scope === 'gym' ? ctx.tenant.name : ctx.scope === 'platform' ? 'Fitnexa' : 'Dashboard';
  const icon = ctx.scope === 'gym' ? ctx.tenant.branding.appIconUrl ?? ctx.tenant.branding.logoUrl : null;
  return {
    title: { default: site, template: `%s · ${site}` },
    robots: { index: false },
    icons: icon ? { icon } : undefined,
  };
}

// Resolves "system" before first paint (only rendered when the gym default is "system" and the
// viewer hasn't chosen). Tiny and static: no user data inside.
const SYSTEM_THEME_SCRIPT = `try{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}catch(e){}`;

export default async function MainRootLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getHostContext();
  const { theme, followSystem } = await getInitialTheme(ctx);
  const accent = ctx.scope === 'gym' ? ctx.tenant.branding.primaryColor : FITNEXA_ACCENT;

  return (
    <html
      lang="en-IN"
      data-theme={theme}
      style={brandVars(accent) as React.CSSProperties}
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>{followSystem && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />}</head>
      <body className="min-h-dvh text-base">
        {ctx.scope === 'gym' || ctx.scope === 'platform' ? (
          <Providers
            site={ctx.scope === 'gym' ? { scope: 'gym', tenant: ctx.tenant } : { scope: 'platform' }}
            hasSession={await hasRefreshCookie()}
          >
            {children}
          </Providers>
        ) : (
          <SiteProblem kind={ctx.scope} host={ctx.host} />
        )}
      </body>
    </html>
  );
}
