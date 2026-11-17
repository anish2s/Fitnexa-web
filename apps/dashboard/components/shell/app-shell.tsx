'use client';

import { useState, type ElementType, type ReactNode } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { Avatar, NavGroup, NavItem } from '@fitnexa/ui';

export interface NavEntry {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode;
}
export interface NavSection {
  label: string;
  items: NavEntry[];
}

export interface AppShellProps {
  /** Sidebar brand: the gym's name + logo (white-label) or the Fitnexa mark (platform). */
  brand: ReactNode;
  /** Compact brand for the mobile top bar. */
  mobileBrand: ReactNode;
  nav: NavSection[];
  isActive: (href: string) => boolean;
  user: { name: string; role: string };
  onSignOut?: () => void;
  /** Theme switch button (or link in the design preview). */
  themeControl?: ReactNode;
  /** Top-bar contents (search, actions); optional until the screens behind them exist. */
  topBar?: ReactNode;
  /** Full-width notice above the page (e.g. the support-session banner). */
  banner?: ReactNode;
  linkAs?: ElementType;
  children: ReactNode;
}

/**
 * Omnix-style shell: grouped sidebar (drawer below lg), sticky translucent top bar, content area.
 * Used by the real app and the design preview, so both stay identical.
 */
export function AppShell({ brand, mobileBrand, nav, isActive, user, onSignOut, themeControl, topBar, banner, linkAs, children }: AppShellProps) {
  const [open, setOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <div className="min-w-0">{brand}</div>
        <button className="rounded-md p-1.5 text-muted hover:bg-surface-2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="size-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Main">
        {nav.map((section) => (
          <NavGroup key={section.label} label={section.label}>
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                as={linkAs}
                href={item.href}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
                active={isActive(item.href)}
                onClick={() => setOpen(false)}
              />
            ))}
          </NavGroup>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <Avatar name={user.name} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-fg">{user.name}</p>
            <p className="truncate text-xs text-subtle">{user.role}</p>
          </div>
          {themeControl}
          <button
            onClick={onSignOut}
            className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] animate-enter border-r border-border bg-surface shadow-3">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/60 px-4 backdrop-blur sm:px-6 ${topBar ? '' : 'lg:hidden'}`}
        >
          <button className="-ml-1 rounded-md p-2 text-muted hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 lg:hidden">{mobileBrand}</div>
          <div className="flex min-w-0 flex-1 items-center gap-3">{topBar}</div>
          <span className="hidden sm:block"><Avatar name={user.name} size={32} /></span>
        </header>
        {banner}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
