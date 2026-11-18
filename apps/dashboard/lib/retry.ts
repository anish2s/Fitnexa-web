/**
 * When a failed query is tried again (TanStack Query `retry` / `retryDelay`).
 *
 * - 4xx (validation, permission, not found, rate limited…): never. Asking again gives the same answer
 *   and only delays the message the person needs to see.
 * - 5xx and network failures: at most twice, 250 ms then 500 ms apart, so a brief blip heals itself
 *   and a real outage shows its error within about a second.
 * - Anything that isn't an API error is a bug in this app: not retried.
 */
import { ApiError } from '@fitexaa/api-client';

export const MAX_RETRIES = 2;
const BASE_DELAY_MS = 250;

export function isTransient(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 0 || err.status >= 500);
}

/** `failureCount` is how many attempts have failed so far, minus one (TanStack's convention: 0 first). */
export function shouldRetry(failureCount: number, err: unknown): boolean {
  return isTransient(err) && failureCount < MAX_RETRIES;
}

/** Delay before retry number `attempt` (0-based). */
export function retryDelay(attempt: number): number {
  return BASE_DELAY_MS * 2 ** attempt;
}

/** Worst-case time spent waiting between attempts before an error is shown. */
export const MAX_RETRY_WAIT_MS = Array.from({ length: MAX_RETRIES }, (_, i) => retryDelay(i)).reduce((a, b) => a + b, 0);
