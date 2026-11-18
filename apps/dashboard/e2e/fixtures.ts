import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { PASSWORD } from './env';

/**
 * Signed-in tabs without signing in for every test.
 *
 * The API allows 10 sign-ins per account per 15 minutes (per IP), and the suite is meant to pass
 * repeatedly under those normal limits. So each account signs in through the real form once per
 * run; later tests open a new tab in that signed-in browser context, which restores the session
 * from the HttpOnly refresh cookie exactly like a reload does. Tests that are about signing in or
 * out (auth.spec.ts) use their own fresh browser instead.
 *
 * At the end of each test its tabs are closed after the network goes quiet, so a refresh-token
 * rotation in flight always lands in the cookie jar (an old token presented later would be treated
 * as stolen and end the session).
 */
/** A new tab, signed in as `identifier`, open at `path` (default: home). */
type SignedIn = (origin: string, identifier: string, path?: string) => Promise<Page>;

export const test = base.extend<{ signedIn: SignedIn }, { sessions: Map<string, BrowserContext> }>({
  sessions: [
    async ({}, use) => {
      const sessions = new Map<string, BrowserContext>();
      await use(sessions);
      for (const ctx of sessions.values()) await ctx.close();
    },
    { scope: 'worker' },
  ],

  // Playwright's own tracing (trace: retain-on-failure) also records these contexts.
  signedIn: async ({ browser, sessions }, use) => {
    const used = new Set<BrowserContext>();
    await use(async (origin, identifier, path = '/') => {
      const key = `${origin} ${identifier}`;
      let ctx = sessions.get(key);
      const fresh = !ctx;
      if (!ctx) {
        ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        sessions.set(key, ctx);
      }
      used.add(ctx);
      const page = await ctx.newPage();
      if (fresh) {
        await page.goto(`${origin}/login`);
        await page.getByLabel(/email/i).first().fill(identifier);
        await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(`${origin}/`);
        if (path !== '/') await page.goto(origin + path);
      } else {
        await page.goto(origin + path);
      }
      await expect(page.getByRole('button', { name: 'Sign out' }).first()).toBeVisible();
      return page;
    });

    for (const ctx of used) {
      for (const p of ctx.pages()) {
        await p.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
        await p.close();
      }
    }
  },
});

export { expect };
