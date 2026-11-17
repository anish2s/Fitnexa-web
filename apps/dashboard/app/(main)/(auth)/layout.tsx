'use client';

import { Suspense, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { safeNext } from '@/lib/errors';
import { FitnexaBrand, GymMark } from '@/components/shell/brand';
import { ThemeToggle } from '@/components/shell/theme-toggle';

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
  // Only the sign-in page sends signed-in people onward; reset/invite links work either way.
  const isLogin = usePathname() === '/login';

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      {isLogin && (
        <Suspense>
          <RedirectIfSignedIn />
        </Suspense>
      )}
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          {site.scope === 'gym' ? (
            <>
              <GymMark name={site.tenant.name} logoUrl={site.tenant.branding.logoUrl} size={48} />
              <p className="mt-3 text-xl font-semibold tracking-tight">{site.tenant.name}</p>
            </>
          ) : (
            <FitnexaBrand size={40} />
          )}
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

        <div className="rounded-xl border border-border bg-surface p-6 shadow-2 sm:p-8">
          {isLogin && (state.status === 'loading' || state.status === 'signedIn') ? (
            <div className="flex flex-col gap-4" aria-busy>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
