'use client';

import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@fitnexa/ui';
import { useAuth } from '@/lib/auth';
import { useSite } from '@/lib/site';
import { PageHeader } from '@/components/page-header';
import { AccountSettings } from './account-settings';
import { BrandingSettings } from './branding-settings';
import { GymSettings } from './gym-settings';
import { PaymentSettings } from './payment-settings';

type Tab = { value: string; label: string; render: () => ReactNode };

/** Settings: gym, branding and online payments for the owner; "My account" for everyone. */
export function Settings() {
  const site = useSite();
  const { can } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const gym = site.scope === 'gym';
  const tabs: Tab[] = [
    ...(gym && can('gym:update') ? [{ value: 'gym', label: 'Gym', render: () => <GymSettings /> }] : []),
    ...(gym && can('branding:update') ? [{ value: 'branding', label: 'Branding', render: () => <BrandingSettings /> }] : []),
    ...(gym && can('gym:update') ? [{ value: 'payments', label: 'Online payments', render: () => <PaymentSettings /> }] : []),
    { value: 'account', label: 'My account', render: () => <AccountSettings /> },
  ];
  const current = tabs.find((t) => t.value === params.get('tab')) ?? tabs[0]!;
  const go = (value: string) => router.replace(value === tabs[0]!.value ? pathname : `${pathname}?tab=${value}`, { scroll: false });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <PageHeader title="Settings" description={tabs.length > 1 ? 'Your gym, how it looks, online payments and your own account.' : 'Your account, password and signed-in devices.'} />
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Settings" className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={current.value === t.value}
              onClick={() => go(t.value)}
              className={cn('-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap', current.value === t.value ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div key={current.value}>{current.render()}</div>
    </div>
  );
}
