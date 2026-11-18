'use client';

import type { ReactNode } from 'react';
import {
  BarChart3, Bell, Building2, CalendarClock, CreditCard, LayoutDashboard, Moon, ScanLine, ScrollText, Search,
  Settings, ShieldCheck, Sun, Tag, UserCog, Users,
} from 'lucide-react';
import { Badge, Kbd } from '@fitexaa/ui';
import { AppShell as Shell, type NavSection } from '@/components/shell/app-shell';
import { FitexaaBrand, GymBrand } from '@/components/shell/brand';

export type ShellKind = 'owner' | 'staff' | 'platform';

function navFor(kind: ShellKind): NavSection[] {
  if (kind === 'platform') {
    return [
      { label: 'Platform', items: [{ href: '#gyms', label: 'Gyms', icon: <Building2 /> }, { href: '#audit', label: 'Audit log', icon: <ScrollText /> }] },
      { label: 'Account', items: [{ href: '#security', label: 'Security', icon: <ShieldCheck /> }, { href: '#settings', label: 'Settings', icon: <Settings /> }] },
    ];
  }
  const owner = kind === 'owner';
  return [
    {
      label: 'Main',
      items: [
        { href: '#overview', label: 'Overview', icon: <LayoutDashboard /> },
        { href: '#front-desk', label: 'Front desk', icon: <ScanLine /> },
        { href: '#members', label: 'Members', icon: <Users /> },
        { href: '#renewals', label: 'Renewals', icon: <CalendarClock />, badge: <Badge tone="warning">24</Badge> },
      ],
    },
    {
      label: 'Finance',
      items: [
        { href: '#payments', label: 'Payments', icon: <CreditCard /> },
        { href: '#plans', label: 'Plans', icon: <Tag /> },
        ...(owner ? [{ href: '#reports', label: 'Reports', icon: <BarChart3 /> }] : []),
      ],
    },
    {
      label: 'Account',
      items: [
        ...(owner ? [{ href: '#staff', label: 'Staff', icon: <UserCog /> }, { href: '#audit', label: 'Audit log', icon: <ScrollText /> }] : []),
        { href: '#settings', label: 'Settings', icon: <Settings /> },
      ],
    },
  ];
}

/** Mock-up shell for the design preview: the real AppShell with sample navigation. */
export function AppShell({
  kind, active, gymName = '', userName, userRole, themeHref, theme, children,
}: {
  kind: ShellKind;
  active: string;
  gymName?: string;
  userName: string;
  userRole: string;
  themeHref: string;
  theme: 'dark' | 'light';
  children: ReactNode;
}) {
  return (
    <Shell
      brand={kind === 'platform' ? <FitexaaBrand /> : <GymBrand name={gymName} />}
      mobileBrand={kind === 'platform' ? <FitexaaBrand size={26} subtitle={null} /> : <GymBrand name={gymName} size={26} />}
      nav={navFor(kind)}
      isActive={(href) => href === `#${active}`}
      user={{ name: userName, role: userRole }}
      themeControl={
        <a href={themeHref} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Switch theme">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </a>
      }
      topBar={
        <>
          <label className="relative hidden w-full max-w-sm sm:block lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input
              placeholder={kind === 'platform' ? 'Search gyms, owners, slugs…' : 'Search members, phone, code…'}
              className="h-9 w-full rounded-lg border border-border bg-surface pr-14 pl-9 text-base text-fg placeholder:text-subtle focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none"
            />
            <span className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
          </label>
          <div className="ml-auto flex items-center gap-1">
            <button className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg sm:hidden" aria-label="Search"><Search className="size-5" /></button>
            <button className="relative rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Notifications">
              <Bell className="size-5" />
              <span className="absolute top-2 right-2 size-2 rounded-full border-2 border-bg bg-accent" />
            </button>
          </div>
        </>
      }
    >
      {children}
    </Shell>
  );
}
