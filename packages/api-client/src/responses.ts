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

// ---- Members (Milestone 2) ----

export type Gender = 'male' | 'female' | 'other' | 'undisclosed';

/** GET /members item */
export interface MemberListItem {
  id: string;
  memberCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  joinDate: string;
  appAccess: boolean;
  archivedAt: string | null;
  /** Current membership, picked like the profile (active, else next upcoming, else latest). */
  membership: MemberListMembership;
  /** Owed across all non-cancelled memberships; never negative. */
  balanceDuePaise: number;
}

export interface MemberListMembership {
  status: 'active' | 'upcoming' | 'expired' | 'none';
  /** Active, ends within the gym's renewal reminder window, not yet renewed. */
  expiringSoon: boolean;
  plan: { id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  daysLeft: number | null;
  nextStartDate: string | null;
}

export interface EmergencyContact {
  name: string;
  phone: string | null;
  relation: string | null;
}

export type PlanDuration = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type TaxMode = 'inclusive' | 'exclusive' | 'none';
export type MembershipStatus = 'active' | 'upcoming' | 'expired' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

/** A membership as sold (plan snapshot, money in paise). */
export interface MembershipView {
  id: string;
  memberId: string;
  plan: { id: string; name: string; duration: PlanDuration; months: number; pricePaise: number; taxMode: TaxMode; gstRate: number };
  discountPaise: number;
  basePaise: number;
  gstPaise: number;
  totalPaise: number;
  paidPaise: number;
  /** Negative = overpaid. */
  balancePaise: number;
  paymentStatus: PaymentStatus | string;
  startDate: string;
  endDate: string;
  kind: string;
  status: MembershipStatus;
  /** Days left incl. today (active) or until it starts (upcoming); null otherwise. */
  daysLeft: number | null;
  cancelledAt: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  soldBy?: string | null;
}

export interface MembershipSummary {
  status: MembershipStatus | 'none';
  current: MembershipView | null;
  /** A renewal already queued after the active one. */
  nextStartDate: string | null;
}

/** GET /members/:id (and POST/PATCH results) */
export interface MemberDetail {
  id: string;
  memberCode: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  joinDate: string;
  emergencyContact: EmergencyContact | null;
  photoUrl: string | null;
  /** Staff-only. */
  notes: string | null;
  consent: { at: string; version: string } | null;
  appAccess: { enabled: boolean; reason: 'no_email' | 'archived' | null; lastLoginAt: string | null };
  membership: MembershipSummary;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** GET /members/:id/memberships */
export interface MemberMemberships {
  summary: MembershipSummary;
  items: MembershipView[];
}

/** POST /members/import (also `error.details` of a 422 IMPORT_INVALID) */
export interface ImportReport {
  dryRun: boolean;
  total: number;
  valid: number;
  errorCount: number;
  errors: { row: number; field: string | null; message: string }[];
  created: number;
  firstCode?: string;
  lastCode?: string;
}

/** POST /uploads/signature: fields to POST to Cloudinary along with the file. */
export interface SignedUpload {
  uploadUrl: string;
  fields: Record<string, string>;
  publicId: string;
  deliveryUrl: string;
}

// ---- Plans ----

/** GET /plans item, GET/POST/PATCH /plans/:id */
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  duration: PlanDuration;
  months: number;
  pricePaise: number;
  taxMode: TaxMode;
  gstRate: number;
  /** What a member pays and how much of it is GST. */
  breakdown: { basePaise: number; gstPaise: number; totalPaise: number };
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** GET /gym (the fields the dashboard reads so far) */
export interface GymView {
  id: string;
  name: string;
  slug: string;
  settings: { timezone?: string; gstin?: string | null; [k: string]: unknown };
  [k: string]: unknown;
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
  'get /api/v1/gym': GymView;
  'get /api/v1/members': MemberListItem[];
  'post /api/v1/members': MemberDetail;
  'get /api/v1/members/{id}': MemberDetail;
  'patch /api/v1/members/{id}': MemberDetail;
  'post /api/v1/members/{id}/archive': MemberDetail;
  'post /api/v1/members/{id}/restore': MemberDetail;
  'put /api/v1/members/{id}/photo': MemberDetail;
  'delete /api/v1/members/{id}/photo': MemberDetail;
  'get /api/v1/members/{id}/memberships': MemberMemberships;
  'post /api/v1/members/import': ImportReport;
  'post /api/v1/uploads/signature': SignedUpload;
  'get /api/v1/plans': Plan[];
  'post /api/v1/plans': Plan;
  'get /api/v1/plans/{id}': Plan;
  'patch /api/v1/plans/{id}': Plan;
  'post /api/v1/plans/{id}/archive': Plan;
  'post /api/v1/plans/{id}/restore': Plan;
}
