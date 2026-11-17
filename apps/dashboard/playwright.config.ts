import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests against a running dashboard + API with the backend's demo seed.
 * See README "End-to-end tests". Uses the installed Chrome (no browser download).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 }, // dev server compiles routes on first visit
  retries: 0,
  workers: 1, // the API rate-limits sign-ins; keep runs gentle and deterministic
  reporter: [['list']],
  use: {
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
  },
});
