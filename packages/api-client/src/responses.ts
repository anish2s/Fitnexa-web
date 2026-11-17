/**
 * Response `data` shapes, transcribed from fitnexa-backend docs/API.md (the OpenAPI spec describes
 * responses only as the generic envelope). Add types here as screens start using endpoints.
 * Money is integer paise; dates are `YYYY-MM-DD` (gym-local) unless named `…At` (ISO timestamp).
 */

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type Theme = 'dark' | 'light' | 'system';

export interface Branding {
  logoUrl: string | null;
  appIconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  defaultTheme: Theme;
}

/** GET /public/tenant */
export interface PublicTenant {
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  branding: Branding;
}

export type Role = 'owner' | 'staff' | 'member' | 'super_admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: string;
  permissions: string[];
}

/** POST /auth/login, /auth/refresh, /auth/magic-link/verify */
export interface Session {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
}

/** GET /auth/me */
export interface Me {
  user: SessionUser;
  scope: 'tenant' | 'platform';
  gym: { name: string; slug: string } | null;
  impersonatedBy: { id: string; name: string } | null;
}

export interface PeriodRevenue {
  from: string;
  to: string;
  receivedPaise: number;
  refundedPaise: number;
  netPaise: number;
}

/** GET /dashboard */
export interface DashboardSummary {
  date: string;
  members: { total: number; active: number; newThisMonth: number };
  attendanceToday: { checkIns: number; rate: number };
  pendingRenewals: { expiringSoon: number; windowDays: number; recentlyLapsed: number };
  dues: { outstandingPaise: number; memberships: number };
  /** null unless the caller has reports:read */
  revenue: { thisMonth: PeriodRevenue; lastMonth: PeriodRevenue } | null;
  alerts?: { duplicatePaymentsRefundDue: number | null };
}

export type GroupBy = 'day' | 'week' | 'month';

interface ReportBase<Row> {
  from: string;
  to: string;
  groupBy: GroupBy;
  series: Row[];
}

/** GET /reports/revenue */
export interface RevenueReport
  extends ReportBase<{ period: string; receivedPaise: number; refundedPaise: number; netPaise: number; payments: number; refunds: number }> {
  totals: { receivedPaise: number; refundedPaise: number; netPaise: number; payments: number; refunds: number };
}

/** GET /reports/attendance */
export interface AttendanceReport extends ReportBase<{ period: string; checkIns: number }> {
  totals: { checkIns: number; uniqueMembers: number; averagePerDay: number };
}

/** GET /reports/growth */
export interface GrowthReport
  extends ReportBase<{ period: string; asOf: string; joined: number; archived: number; totalMembers: number; activeMembers: number }> {
  totals: { joined: number; archived: number; netChange: number };
}

export interface MemberRef {
  id: string;
  memberCode: string;
  name: string;
  phone: string;
  photoUrl: string | null;
  archived?: boolean;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'razorpay';

/** GET /payments item */
export interface PaymentListItem {
  id: string;
  receiptNumber: string;
  memberId: string;
  membershipId: string;
  amountPaise: number;
  refundedPaise: number;
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
  member?: MemberRef;
}

/** GET /memberships/expiring item */
export interface ExpiringMembership {
  id: string;
  memberId: string;
  plan: { id: string; name: string; duration: string; months: number };
  startDate: string;
  endDate: string;
  daysLeft: number;
  status: string;
  member: MemberRef;
  whatsappUrl?: string;
}

/** GET /platform/tenants item */
export interface PlatformTenantListItem {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  city: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
}

/**
 * `data` type per endpoint, keyed "<method> <path>" exactly as in the OpenAPI paths. Endpoints not
 * listed here return `unknown` until a screen needs them.
 */
export interface ResponseMap {
  'get /api/v1/public/tenant': PublicTenant;
  'post /api/v1/auth/login': Session;
  'post /api/v1/auth/refresh': Session;
  'post /api/v1/auth/logout': undefined;
  'post /api/v1/auth/password/forgot': undefined;
  'post /api/v1/auth/password/reset': undefined;
  'post /api/v1/auth/impersonation/end': undefined;
  'get /api/v1/auth/me': Me;
  'get /api/v1/dashboard': DashboardSummary;
  'get /api/v1/reports/revenue': RevenueReport;
  'get /api/v1/reports/attendance': AttendanceReport;
  'get /api/v1/reports/growth': GrowthReport;
  'get /api/v1/payments': PaymentListItem[];
  'get /api/v1/memberships/expiring': ExpiringMembership[];
  'get /api/v1/platform/tenants': PlatformTenantListItem[];
}
