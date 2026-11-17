'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { safeNext } from '@/lib/errors';
import { FitnexaGlyph, GymMark } from '@/components/shell/brand';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { AuthBackdrop, AuthHero, AuthIntro } from '@/components/auth/auth-showcase';

function RedirectIfSignedIn() {
  const { state } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (state.status === 'signedIn') router.replace(safeNext(params.get('next')));
  }, [state.status, router, params]);
  return null;
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const site = useSite();
  const { state } = useAuth();
  const platform = site.scope === 'platform';
  // Only the sign-in page sends signed-in people onward; reset/invite links work either way.
  const isLogin = usePathname() === '/login';

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-bg">
      {isLogin && (
        <Suspense>
          <RedirectIfSignedIn />
        </Suspense>
      )}
      <AuthBackdrop />
      <AuthHero />
      <ThemeToggle className="absolute top-4 right-4 z-10" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1440px] items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_440px] lg:px-12 xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_460px_30%]">
        <div className="hidden lg:block">
          <AuthIntro platform={platform} />
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-8 flex items-center justify-center gap-4">
            {site.scope === 'gym' ? (
              <GymMark name={site.tenant.name} logoUrl={site.tenant.branding.logoUrl} size={64} />
            ) : (
              <FitnexaGlyph size={64} />
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-2xl font-bold tracking-tight text-fg">{site.scope === 'gym' ? site.tenant.name : 'Fitnexa'}</p>
              <p className="mt-1 text-sm text-muted">{platform ? 'Platform console' : 'Be Fit. Live Better.'}</p>
            </div>
          </div>

          {site.scope === 'gym' && site.tenant.status === 'suspended' && (
            <div role="status" className="mb-4 flex gap-3 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-text" />
              <p>
                <span className="font-medium">Access to {site.tenant.name} is paused.</span>{' '}
                <span className="text-muted">Sign-in is unavailable until the account is reactivated. If you run this gym, contact support.</span>
              </p>
            </div>
          )}

          <div className="rounded-[24px] border border-accent-ring/60 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--accent)_10%,var(--surface)),var(--surface)_55%)] p-6 shadow-3 backdrop-blur-xl sm:p-10">
            {isLogin && (state.status === 'loading' || state.status === 'signedIn') ? (
              <div className="flex flex-col gap-4" aria-busy>
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>

        {/* Third grid column is reserved for the hero artwork (absolutely positioned). */}
        <div className="hidden 2xl:block" />
      </div>
    </div>
  );
}
