import type { ReactNode } from 'react';
import {
  BarChart3, Building2, CalendarClock, CreditCard, LayoutDashboard, ScanLine, ScrollText, Settings, Tag, UserCog, Users,
} from 'lucide-react';

export interface Route {
  href: string;
  label: string;
  icon: ReactNode;
  /** Shown only if the user holds this permission (UI only; the API enforces it regardless). */
  permission?: string;
  /** Milestone that builds the screen; absent = built. */
  comingIn?: string;
}

export interface RouteSection {
  label: string;
  routes: Route[];
}

export const GYM_ROUTES: RouteSection[] = [
  {
    label: 'Main',
    routes: [
      { href: '/', label: 'Overview', icon: <LayoutDashboard />, permission: 'dashboard:read' },
      { href: '/front-desk', label: 'Front desk', icon: <ScanLine />, permission: 'attendance:checkin', comingIn: 'Milestone 3' },
      { href: '/members', label: 'Members', icon: <Users />, permission: 'members:read', comingIn: 'Milestone 2' },
      { href: '/renewals', label: 'Renewals', icon: <CalendarClock />, permission: 'memberships:read', comingIn: 'Milestone 3' },
    ],
  },
  {
    label: 'Finance',
    routes: [
      { href: '/payments', label: 'Payments', icon: <CreditCard />, permission: 'payments:read', comingIn: 'Milestone 3' },
      { href: '/plans', label: 'Plans', icon: <Tag />, permission: 'plans:read', comingIn: 'Milestone 2' },
      { href: '/reports', label: 'Reports', icon: <BarChart3 />, permission: 'reports:read', comingIn: 'Milestone 4' },
    ],
  },
  {
    label: 'Account',
    routes: [
      { href: '/staff', label: 'Staff', icon: <UserCog />, permission: 'staff:read', comingIn: 'Milestone 4' },
      { href: '/audit-log', label: 'Audit log', icon: <ScrollText />, permission: 'audit:read', comingIn: 'Milestone 4' },
      { href: '/settings', label: 'Settings', icon: <Settings />, comingIn: 'Milestone 4' },
    ],
  },
];

export const PLATFORM_ROUTES: RouteSection[] = [
  {
    label: 'Platform',
    routes: [
      { href: '/', label: 'Gyms', icon: <Building2 /> },
      { href: '/audit-log', label: 'Audit log', icon: <ScrollText />, comingIn: 'Milestone 5' },
    ],
  },
  { label: 'Account', routes: [{ href: '/settings', label: 'Settings', icon: <Settings />, comingIn: 'Milestone 5' }] },
];

export function findRoute(sections: RouteSection[], href: string): Route | undefined {
  for (const s of sections) for (const r of s.routes) if (r.href === href) return r;
  return undefined;
}

export const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  staff: 'Staff',
  super_admin: 'Super admin',
  member: 'Member',
};
