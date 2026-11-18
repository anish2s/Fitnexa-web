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
  byMethod?: Partial<Record<PaymentMethod, { receivedPaise: number; payments: number }>>;
}

/** GET /reports/attendance */
export interface AttendanceReport extends ReportBase<{ period: string; checkIns: number }> {
  totals: { checkIns: number; uniqueMembers: number; averagePerDay: number };
  byHour?: { hour: number; checkIns: number }[];
  byWeekday?: { weekday: string; checkIns: number }[];
}

/** GET /reports/memberships */
export interface MembershipsReport
  extends ReportBase<{ period: string; sold: number; new: number; renewals: number; valuePaise: number; discountPaise: number; cancelled: number }> {
  totals: { sold: number; new: number; renewals: number; valuePaise: number; discountPaise: number; cancelled: number };
  byPlan: { plan: string; sold: number; valuePaise: number }[];
}

/** GET /reports/renewals (renewalRate null when nothing was decided in the period) */
export interface RenewalsReport
  extends ReportBase<{ period: string; ending: number; renewedOnTime: number; renewedLate: number; notRenewed: number; pending: number; renewalRate: number | null }> {
  totals: { ending: number; renewedOnTime: number; renewedLate: number; notRenewed: number; pending: number; renewalRate: number | null };
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

export interface RefundView {
  id: string;
  refundNumber: string;
  amountPaise: number;
  method: string;
  status: 'pending' | 'processed' | 'failed' | string;
  refundedAt: string;
  reason?: string;
  refundedBy?: string | null;
}

/** A payment (receipt). Money in paise. */
export interface PaymentView {
  id: string;
  receiptNumber: string;
  financialYear: string;
  memberId: string;
  membershipId: string;
  amountPaise: number;
  refundedPaise: number;
  refunds: RefundView[];
  method: PaymentMethod;
  reference: string | null;
  receivedAt: string;
  receivedBy?: string | null;
  notes?: string | null;
  gateway?: { provider: string; orderId: string; paymentId: string } | null;
  createdAt?: string | null;
}

/** GET /payments item */
export interface PaymentListItem extends PaymentView {
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

export interface GymAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
}

export interface GymSettings {
  timezone: string;
  currency: string;
  locale: string;
  gstin: string | null;
  receiptPrefix: string;
  renewalReminderDays: number;
  renewalRemindersEnabled: boolean;
}

/** GET /gym, PATCH /gym, PATCH /gym/branding */
export interface GymView {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  email: string | null;
  phone: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  address: GymAddress;
  settings: GymSettings;
  branding: Branding;
  subscription: { status: string; planCode: string; priceMonthlyPaise: number; currentPeriodEnd: string | null };
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Front desk & money (Milestone 3) ----

/** POST /members/:id/memberships and /renew: the membership, plus the payment if one was taken. */
export type MembershipSale = MembershipView & { payment?: PaymentView };

/** GET /payments/:id, POST /memberships/:id/payments, POST /payments/:id/refunds */
export interface PaymentDetail extends PaymentView {
  membership: MembershipView;
}

/** GET /memberships item */
export interface MembershipListItem extends MembershipView {
  member: MemberRef;
}

export interface CheckIn {
  id: string;
  memberId: string;
  membershipId: string;
  day: string;
  checkedInAt: string;
  method: 'qr' | 'manual';
}

/** POST /attendance/scan and /attendance/manual */
export interface CheckInResult {
  status: 'checked_in' | 'already_checked_in';
  checkIn: CheckIn;
  member: { id: string; name: string; memberCode: string; phone: string | null; photoUrl: string | null };
  membership: { id: string; plan: string; endDate: string; daysLeft: number; balancePaise: number; paymentStatus: string };
}

/** GET /attendance item */
export interface AttendanceRow extends CheckIn {
  member: { id: string; name: string; memberCode: string; phone: string | null; photoUrl: string | null };
}

/** GET /attendance/report */
export interface AttendanceDayReport {
  date: string;
  total: number;
  byMethod: { qr: number; manual: number };
  byHour: { hour: number; count: number }[];
  busiestHour: number | null;
  activeMembers: number;
  attendanceRate: number;
}

/** GET /members/:id/whatsapp */
export interface WhatsappLink {
  template: 'renewal' | 'payment_due' | 'welcome' | 'custom';
  phone: string;
  text: string;
  url: string;
}

/** GET /notifications item (renewal reminder emails) */
export interface NotificationItem {
  id: string;
  kind: string;
  channel: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'skipped' | 'cancelled';
  attempts: number;
  nextAttemptAt: string | null;
  sentAt: string | null;
  reason: string | null;
  membershipId: string | null;
  member: { id: string; name: string; memberCode: string; phone: string | null } | null;
  createdAt: string;
}

/** GET /gym/payment-gateway */
export interface GatewayStatus {
  available: boolean;
  razorpay: { connected: boolean; keyId: string | null; mode: 'test' | 'live' | null; liveAllowed: boolean; webhookUrl: string; updatedAt: string | null };
}

/** POST /memberships/:id/razorpay-order: parameters for Razorpay Checkout. */
export interface RazorpayCheckout {
  keyId: string;
  orderId: string;
  amountPaise: number;
  currency: 'INR';
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
}

// ---- Owner tools (Milestone 4) ----

/** GET /staff item, GET/PATCH /staff/:id */
export interface StaffView {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: 'owner' | 'staff';
  status: 'invited' | 'active' | 'disabled';
  /** The owner's extra grants (grantable permissions only). */
  grants: string[];
  /** The full effective permission set. */
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

/** POST /staff */
export interface StaffCreated {
  staff: StaffView;
  inviteSent: boolean;
  inviteError: string | null;
}

/** POST /staff/:id/invite */
export interface InviteResult {
  sent: boolean;
  reason: string | null;
}

/** GET /audit-logs item */
export interface AuditEntry {
  id: string;
  action: string;
  actor: { type: 'user' | 'platform_admin' | 'system'; id: string | null; name: string | null; role: string | null };
  impersonator: { id: string; name: string } | null;
  target: { type: string; id: string } | null;
  changes: { field: string; from: unknown; to: unknown }[];
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

/** GET /auth/sessions item */
export interface SessionInfo {
  id: string;
  current: boolean;
  impersonated: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  userAgent: string | null;
  ip: string | null;
}

/** GET /gym/payment-gateway/alerts */
export interface GatewayAlerts {
  openCount: number;
  items: {
    id: string;
    kind: 'duplicate_payment';
    status: 'duplicate_refund_due' | 'resolved';
    amountPaise: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    appliedRazorpayPaymentId: string | null;
    membershipId: string;
    memberId: string;
    memberName: string;
    source: 'checkout' | 'webhook';
    createdAt: string;
    resolvedAt: string | null;
    resolutionNote: string | null;
  }[];
}

/** POST /members/:id/erase */
export interface EraseResult {
  memberCode: string;
  erasedAt: string;
  removed: string[];
  retained: string[];
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
  'post /api/v1/attendance/scan': CheckInResult;
  'post /api/v1/attendance/manual': CheckInResult;
  'get /api/v1/attendance': AttendanceRow[];
  'get /api/v1/attendance/report': AttendanceDayReport;
  'get /api/v1/members/{id}/attendance': CheckIn[];
  'post /api/v1/members/{id}/memberships': MembershipSale;
  'post /api/v1/members/{id}/memberships/renew': MembershipSale;
  'post /api/v1/memberships/{id}/cancel': MembershipView;
  'get /api/v1/memberships': MembershipListItem[];
  'post /api/v1/memberships/{id}/payments': PaymentDetail;
  'get /api/v1/payments/{id}': PaymentDetail;
  'get /api/v1/members/{id}/payments': PaymentView[];
  'post /api/v1/payments/{id}/refunds': PaymentDetail;
  'get /api/v1/members/{id}/whatsapp': WhatsappLink;
  'get /api/v1/notifications': NotificationItem[];
  'post /api/v1/notifications/{id}/retry': NotificationItem;
  'post /api/v1/notifications/{id}/cancel': NotificationItem;
  'get /api/v1/gym/payment-gateway': GatewayStatus;
  'post /api/v1/memberships/{id}/razorpay-order': RazorpayCheckout;
  'post /api/v1/payments/razorpay/verify': PaymentView;
  'patch /api/v1/gym': GymView;
  'patch /api/v1/gym/branding': GymView;
  'get /api/v1/reports/memberships': MembershipsReport;
  'get /api/v1/reports/renewals': RenewalsReport;
  'get /api/v1/staff': StaffView[];
  'post /api/v1/staff': StaffCreated;
  'get /api/v1/staff/{id}': StaffView;
  'patch /api/v1/staff/{id}': StaffView;
  'post /api/v1/staff/{id}/deactivate': StaffView;
  'post /api/v1/staff/{id}/activate': StaffView;
  'post /api/v1/staff/{id}/invite': InviteResult;
  'get /api/v1/audit-logs': AuditEntry[];
  'get /api/v1/auth/sessions': SessionInfo[];
  'delete /api/v1/auth/sessions/{id}': undefined;
  'post /api/v1/auth/logout-all': undefined;
  'post /api/v1/auth/password/change': undefined;
  'put /api/v1/gym/payment-gateway/razorpay': GatewayStatus;
  'delete /api/v1/gym/payment-gateway/razorpay': GatewayStatus;
  'get /api/v1/gym/payment-gateway/alerts': GatewayAlerts;
  'post /api/v1/gym/payment-gateway/alerts/{id}/resolve': GatewayAlerts['items'][number];
  'post /api/v1/members/{id}/erase': EraseResult;
}
