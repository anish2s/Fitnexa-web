'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CloudOff } from 'lucide-react';
import { Badge, Button, EmptyState, Skeleton } from '@fitexaa/ui';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { useDashboard } from '@/lib/queries';
import { GYM_ROUTES, PLATFORM_ROUTES, ROLE_LABEL, visibleNav } from '@/lib/nav';
import { errorMessage } from '@/lib/errors';
import { AppShell, type NavSection } from '@/components/shell/app-shell';
import { FitexaaBrand, GymBrand } from '@/components/shell/brand';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { SupportSessionBanner } from '@/components/support-session-banner';

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy aria-label="Loading">
      <div className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 lg:block">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 flex flex-col gap-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
      </div>
      <div className="flex-1 p-6 sm:p-8">
        <Skeleton className="h-8 w-64" />
        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      </div>
    </div>
  );
}

function SignedInShell({ children }: { children: ReactNode }) {
  const site = useSite();
  const { state, can, signOut } = useAuth();
  const pathname = usePathname();
  const dashboard = useDashboard();
  if (state.status !== 'signedIn') return null;
  const { me } = state;

  const expiring = dashboard.data?.pendingRenewals.expiringSoon ?? 0;
  const sections = site.scope === 'gym' ? GYM_ROUTES : PLATFORM_ROUTES;
  const nav: NavSection[] = visibleNav(sections, can).map((s) => ({
    label: s.label,
    items: s.routes.map((r) => ({
      href: r.href,
      label: r.label,
      icon: r.icon,
      badge: r.href === '/renewals' && expiring > 0 ? <Badge tone="warning">{expiring}</Badge> : undefined,
    })),
  }));

  const gymName = site.scope === 'gym' ? site.tenant.name : '';
  const logoUrl = site.scope === 'gym' ? site.tenant.branding.logoUrl : null;

  return (
    <AppShell
      brand={site.scope === 'gym' ? <GymBrand name={gymName} logoUrl={logoUrl} /> : <FitexaaBrand />}
      mobileBrand={site.scope === 'gym' ? <GymBrand name={gymName} logoUrl={logoUrl} size={26} /> : <FitexaaBrand size={26} subtitle={null} />}
      nav={nav}
      isActive={(href) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`))}
      user={{ name: me.user.name, role: me.scope === 'platform' ? 'Super admin' : (ROLE_LABEL[me.user.role] ?? me.user.role) }}
      onSignOut={() => void signOut()}
      themeControl={<ThemeToggle />}
      banner={me.impersonatedBy ? <SupportSessionBanner adminName={me.impersonatedBy.name} gymName={gymName} /> : undefined}
      linkAs={Link}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { state, retry } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === 'signedOut' && state.reason === 'support-ended') {
      router.replace('/support-session?ended=1');
      return;
    }
    if (state.status === 'signedOut') {
      const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [state, router, pathname]);

  if (state.status === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState icon={<CloudOff />} title="Can’t load your account" description={errorMessage(state.error)} action={<Button onClick={retry}>Try again</Button>} />
      </main>
    );
  }
  if (state.status !== 'signedIn') return <ShellSkeleton />;
  return <SignedInShell>{children}</SignedInShell>;
}
