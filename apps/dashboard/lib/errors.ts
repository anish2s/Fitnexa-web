import { ApiError } from '@fitnexa/api-client';

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
