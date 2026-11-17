/**
 * SAMPLE DATA for the Milestone 0 design preview only. Every name, number and gym here is made up.
 * Shapes follow the backend responses (docs/API.md) so the mock-ups show realistic content.
 */
import type { Theme } from '@fitnexa/ui';

export type GymKey = 'rose' | 'sky';

export interface SampleGym {
  key: GymKey;
  name: string;
  shortName: string;
  slug: string;
  primaryColor: string;
  owner: string;
  staff: string;
}

export const SAMPLE_GYMS: Record<GymKey, SampleGym> = {
  rose: {
    key: 'rose',
    name: 'Powerhouse Fitness',
    shortName: 'Powerhouse',
    slug: 'powerhouse',
    primaryColor: '#E11D48',
    owner: 'Rahul Mehta',
    staff: 'Neha Kapoor',
  },
  sky: {
    key: 'sky',
    name: 'Wave Fitness Club',
    shortName: 'Wave',
    slug: 'wave',
    primaryColor: '#0EA5E9',
    owner: 'Arjun Nair',
    staff: 'Priya Iyer',
  },
};

/** Fitnexa's own platform accent (super admin console only). Proposal; open to change. */
export const FITNEXA_ACCENT = '#6366F1';

export interface PreviewParams {
  theme: Theme;
  gym: SampleGym;
}

export function parseParams(sp: Record<string, string | string[] | undefined>): PreviewParams {
  const theme: Theme = sp.theme === 'light' ? 'light' : 'dark';
  const gym = SAMPLE_GYMS[sp.gym === 'sky' ? 'sky' : 'rose'];
  return { theme, gym };
}

/** ₹ from integer paise, Indian grouping (₹3,42,500). */
export function inr(paise: number, opts: { decimals?: boolean } = {}) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: opts.decimals ? 2 : 0,
    minimumFractionDigits: opts.decimals ? 2 : 0,
  }).format(paise / 100);
}

/** ₹3.4L / ₹85k style for chart axes. */
export function inrShort(rupees: number) {
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(rupees % 100000 === 0 ? 0 : 1)}L`;
  if (rupees >= 1000) return `₹${Math.round(rupees / 1000)}k`;
  return `₹${rupees}`;
}

export const REVENUE_12M = [
  { label: 'Dec', value: 238000 }, { label: 'Jan', value: 312000 }, { label: 'Feb', value: 276000 },
  { label: 'Mar', value: 289000 }, { label: 'Apr', value: 301000 }, { label: 'May', value: 268000 },
  { label: 'Jun', value: 254000 }, { label: 'Jul', value: 279000 }, { label: 'Aug', value: 296000 },
  { label: 'Sep', value: 318000 }, { label: 'Oct', value: 305000 }, { label: 'Nov', value: 342500 },
];

export const CHECKINS_WEEK = [
  { label: 'Mon', value: 168 }, { label: 'Tue', value: 154 }, { label: 'Wed', value: 171 },
  { label: 'Thu', value: 149 }, { label: 'Fri', value: 142 }, { label: 'Sat', value: 0 }, { label: 'Sun', value: 0 },
];
export const TODAY_INDEX = 4;

export const SPARKS = {
  revenue: [24, 31, 27, 29, 30, 27, 25, 28, 30, 32, 30, 34],
  active: [441, 448, 452, 455, 461, 458, 466, 470, 474, 479, 482, 486],
  newMembers: [22, 31, 26, 29, 35, 24, 28, 33, 30, 36, 31, 38],
  attendance: [131, 152, 140, 158, 149, 0, 0, 168, 154, 171, 149, 142].filter(Boolean),
  renewals: [31, 28, 30, 26, 29, 27, 25, 28, 26, 24, 27, 24],
};

export type MemberStatus = 'active' | 'expiring' | 'expired' | 'upcoming' | 'none';

export interface SampleMember {
  code: string;
  name: string;
  phone: string;
  plan: string | null;
  status: MemberStatus;
  endDate: string | null;
  daysLeft: number | null;
  balancePaise: number;
  appAccess: boolean;
  joined: string;
}

export const MEMBERS: SampleMember[] = [
  { code: 'M0412', name: 'Aarav Sharma', phone: '+91 98110 42231', plan: 'Quarterly', status: 'active', endDate: '14 Jan 2027', daysLeft: 58, balancePaise: 0, appAccess: true, joined: '15 Oct 2026' },
  { code: 'M0398', name: 'Ishita Verma', phone: '+91 99581 77310', plan: 'Monthly', status: 'expiring', endDate: '21 Nov 2026', daysLeft: 4, balancePaise: 0, appAccess: true, joined: '22 Sep 2026' },
  { code: 'M0377', name: 'Kabir Singh', phone: '+91 98731 10984', plan: 'Yearly', status: 'active', endDate: '02 Aug 2027', daysLeft: 258, balancePaise: 500000, appAccess: false, joined: '03 Aug 2026' },
  { code: 'M0365', name: 'Meera Pillai', phone: '+91 90042 66512', plan: 'Monthly', status: 'expired', endDate: '10 Nov 2026', daysLeft: null, balancePaise: 0, appAccess: true, joined: '11 Jun 2026' },
  { code: 'M0351', name: 'Rohan Gupta', phone: '+91 98990 31207', plan: 'Half-yearly', status: 'active', endDate: '27 Feb 2027', daysLeft: 102, balancePaise: 250000, appAccess: true, joined: '28 Aug 2026' },
  { code: 'M0349', name: 'Ananya Reddy', phone: '+91 97012 88430', plan: 'Monthly', status: 'expiring', endDate: '19 Nov 2026', daysLeft: 2, balancePaise: 0, appAccess: true, joined: '20 Jul 2026' },
  { code: 'M0333', name: 'Vikram Joshi', phone: '+91 98201 54419', plan: 'Quarterly', status: 'upcoming', endDate: '28 Feb 2027', daysLeft: null, balancePaise: 450000, appAccess: false, joined: '01 Dec 2025' },
  { code: 'M0318', name: 'Sneha Kulkarni', phone: '+91 99300 21876', plan: null, status: 'none', endDate: null, daysLeft: null, balancePaise: 0, appAccess: true, joined: '05 May 2026' },
];

export const ACTIVITY = [
  { kind: 'payment', title: 'Payment received', detail: 'Rohan Gupta · ₹2,500 UPI · RCPT/2026-27/0418', time: '6 min ago' },
  { kind: 'checkin', title: 'Check-in', detail: 'Aarav Sharma · QR at front desk', time: '12 min ago' },
  { kind: 'member', title: 'New member', detail: 'Tanvi Desai joined on the Quarterly plan', time: '48 min ago' },
  { kind: 'expiring', title: 'Membership expiring', detail: 'Ananya Reddy · Monthly ends in 2 days', time: '1 h ago' },
  { kind: 'refund', title: 'Refund issued', detail: 'Karan Malhotra · ₹1,000 cash · RFND/2026-27/0007', time: '3 h ago' },
] as const;

export const TODAY_CHECKINS = [
  { name: 'Aarav Sharma', code: 'M0412', time: '18:42', method: 'QR' },
  { name: 'Kabir Singh', code: 'M0377', time: '18:37', method: 'QR' },
  { name: 'Rohan Gupta', code: 'M0351', time: '18:21', method: 'Manual' },
  { name: 'Ishita Verma', code: 'M0398', time: '18:05', method: 'QR' },
  { name: 'Ananya Reddy', code: 'M0349', time: '17:58', method: 'QR' },
];

export const PLATFORM_GYMS = [
  { name: 'Powerhouse Fitness', slug: 'powerhouse', city: 'Gurugram', status: 'active', sub: 'active', members: 486, staff: 6, created: '12 Mar 2026', color: '#E11D48' },
  { name: 'Wave Fitness Club', slug: 'wave', city: 'Kochi', status: 'active', sub: 'active', members: 312, staff: 4, created: '02 May 2026', color: '#0EA5E9' },
  { name: 'Iron Temple Gym', slug: 'irontemple', city: 'Pune', status: 'active', sub: 'trialing', members: 74, staff: 2, created: '09 Nov 2026', color: '#F59E0B' },
  { name: 'FitZone Studio', slug: 'fitzone', city: 'Bengaluru', status: 'suspended', sub: 'past_due', members: 205, staff: 3, created: '18 Jan 2026', color: '#22C55E' },
  { name: 'Core Strength', slug: 'corestrength', city: 'Jaipur', status: 'active', sub: 'active', members: 158, staff: 3, created: '27 Jun 2026', color: '#8B5CF6' },
  { name: 'Peak Performance', slug: 'peak', city: 'Lucknow', status: 'active', sub: 'cancelled', members: 41, staff: 1, created: '04 Aug 2026', color: '#111827' },
];
