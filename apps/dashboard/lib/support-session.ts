/**
 * "Log in as owner" hand-off between the platform console and a gym's site.
 * 1. The console opens `<gym origin>/support-session` in a new tab.
 * 2. That tab posts SUPPORT_READY to its opener (nothing secret).
 * 3. The console checks the message came from that tab and the gym's origin, then posts the token
 *    to exactly that origin. The token never appears in a URL and is never stored.
 */
export const SUPPORT_READY = 'fx-support-ready';
export const SUPPORT_TOKEN = 'fx-support-token';

/** The gym's site, on the same protocol and port as this console (dev and production alike). */
export function gymOrigin(appUrl: string): string {
  const host = new URL(appUrl).hostname;
  return `${window.location.protocol}//${host}${window.location.port ? `:${window.location.port}` : ''}`;
}
