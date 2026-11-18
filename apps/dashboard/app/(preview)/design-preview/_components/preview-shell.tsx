import Link from 'next/link';
import type { ReactNode } from 'react';
import { brandVars, cn, ToastProvider } from '@fitexaa/ui';
import { FITEXAA_ACCENT, SAMPLE_GYMS, type PreviewParams } from '../_lib/sample';

export type PreviewPage = '' | 'owner' | 'members' | 'front-desk' | 'platform';

const PAGES: { key: PreviewPage; label: string }[] = [
  { key: '', label: 'Components' },
  { key: 'owner', label: 'Owner overview' },
  { key: 'members', label: 'Members' },
  { key: 'front-desk', label: 'Front desk' },
  { key: 'platform', label: 'Super admin' },
];

export function previewHref(page: PreviewPage, p: { theme: string; gym: string }) {
  return `/design-preview${page ? `/${page}` : ''}?theme=${p.theme}&gym=${p.gym}`;
}

/**
 * Design-preview chrome: a neutral toolbar (not part of the product) to switch page, theme and gym
 * colour, and a [data-theme] wrapper carrying the gym's brand variables.
 */
export function PreviewShell({ params, page, children }: { params: PreviewParams; page: PreviewPage; children: ReactNode }) {
  const { theme, gym } = params;
  const cur = { theme, gym: gym.key };
  const accent = page === 'platform' ? FITEXAA_ACCENT : gym.primaryColor;
  return (
    <div data-theme={theme} style={brandVars(accent) as React.CSSProperties} className="min-h-dvh bg-bg text-fg">
      <ToastProvider>
        <div data-theme="dark" className="relative z-40 border-b border-white/10 bg-[#0b0b0d]/95 text-[#e4e4e7] backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs">
            <span className="flex items-center gap-2 font-semibold">
              <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-black">SAMPLE DATA</span>
              Design preview · Milestone 0
            </span>
            <nav className="-mx-1 flex max-w-full gap-1 overflow-x-auto">
              {PAGES.map((p) => (
                <Link
                  key={p.key}
                  href={previewHref(p.key, cur)}
                  className={cn('rounded px-2 py-1 whitespace-nowrap', p.key === page ? 'bg-white/12 text-white' : 'text-[#a1a1aa] hover:text-white')}
                >
                  {p.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex gap-1">
                {(['dark', 'light'] as const).map((t) => (
                  <Link key={t} href={previewHref(page, { ...cur, theme: t })} className={cn('rounded px-2 py-1 capitalize', t === theme ? 'bg-white/12 text-white' : 'text-[#a1a1aa] hover:text-white')}>
                    {t}
                  </Link>
                ))}
              </div>
              {page !== 'platform' && (
                <div className="flex gap-1">
                  {Object.values(SAMPLE_GYMS).map((g) => (
                    <Link key={g.key} href={previewHref(page, { ...cur, gym: g.key })} title={`${g.name} ${g.primaryColor}`} className={cn('flex items-center gap-1.5 rounded px-2 py-1', g.key === gym.key ? 'bg-white/12 text-white' : 'text-[#a1a1aa] hover:text-white')}>
                      <span className="size-2.5 rounded-full" style={{ background: g.primaryColor }} />
                      {g.primaryColor}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {children}
      </ToastProvider>
    </div>
  );
}
