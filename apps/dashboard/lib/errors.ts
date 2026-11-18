import { ApiError } from '@fitexaa/api-client';

/** Plain-language messages for API error codes shown on forms. Falls back to the server message. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'That email/phone and password don’t match. Check them and try again.',
  LOGIN_LOCKED: 'Too many wrong attempts. Sign-in is locked for 15 minutes, or reset your password to unlock it now.',
  RATE_LIMITED: 'Too many attempts. Please wait a few minutes and try again.',
  ACCOUNT_DISABLED: 'This account has been switched off. Ask the gym owner to turn it back on.',
  TENANT_SUSPENDED: 'Access to this gym is paused at the moment.',
  INVALID_LINK: 'This link has expired or was already used. Request a new one below.',
  NETWORK_ERROR: 'Could not reach the server. Check your connection and try again.',
  API_UNAVAILABLE: 'The service is temporarily unavailable. Please try again shortly.',
  FORBIDDEN: 'You don’t have access to this.',
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return MESSAGES[err.code] ?? err.message;
  return 'Something went wrong. Please try again.';
}

/** Request id for unexpected failures only, so support can find them in the server logs. */
export function errorRef(err: unknown): string | undefined {
  return err instanceof ApiError && err.status >= 500 ? err.requestId : undefined;
}

/** Only allow same-site relative redirects (no open redirect via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.startsWith('/login') || next.startsWith('/api/')) return fallback;
  return next;
}

const ACTION_MESSAGES: Record<string, string> = {
  PAYMENT_GATEWAY_NOT_CONNECTED: 'Online payments aren’t set up for this gym yet. The owner can connect Razorpay in Settings.',
  PAYMENT_GATEWAY_ERROR: 'Razorpay couldn’t complete this. Please try again in a moment.',
  INVALID_SIGNATURE: 'The online payment couldn’t be verified. Check Payments before trying again.',
  DUPLICATE_PAYMENT: 'This order was already paid. The second payment wasn’t applied; the owner will refund it.',
  PASS_EXPIRED: 'This QR pass has expired. Ask the member to refresh it in the app and scan again.',
  PASS_INVALID: 'This QR code isn’t a member pass for this gym.',
  DUPLICATE: 'A member with this phone or email already exists in this gym.',
  UPLOADS_NOT_CONFIGURED: 'Photo uploads aren’t set up for this gym yet.',
  NOT_FOUND: 'This record no longer exists. It may have been removed.',
};

/** Like errorMessage, with wording for member/plan actions. */
export function actionMessage(err: unknown): string {
  if (err instanceof ApiError && ACTION_MESSAGES[err.code]) return ACTION_MESSAGES[err.code]!;
  return errorMessage(err);
}

/**
 * Puts the API's field errors (422 VALIDATION_ERROR, or the field list of a 409 DUPLICATE) on the
 * matching form fields. `fields` are the form's field names (nested ones dotted, e.g.
 * "emergencyContact.phone"); an API path matches a field exactly, or else its closest parent field.
 * Returns true if any field got a message, so the caller can skip a generic banner.
 */
export function applyFieldErrors(err: unknown, setError: (field: never, e: { message: string }) => void, fields: readonly string[]): boolean {
  if (!(err instanceof ApiError)) return false;
  const pairs: [string, string][] =
    err.code === 'VALIDATION_ERROR'
      ? Object.entries(err.fieldErrors())
      : err.code === 'DUPLICATE'
        ? ((err.details as { fields?: string[] } | undefined)?.fields ?? []).map((f) => [f, DUPLICATE_FIELD[f] ?? 'Already in use'])
        : [];
  let hit = false;
  for (const [path, message] of pairs) {
    const field = fields.includes(path) ? path : fields.find((f) => path.startsWith(`${f}.`));
    if (!field) continue;
    setError(field as never, { message });
    hit = true;
  }
  return hit;
}

const DUPLICATE_FIELD: Record<string, string> = {
  phone: 'Another member already has this phone number',
  email: 'This email is already used in this gym',
  nameKey: 'A plan with this name already exists',
};
