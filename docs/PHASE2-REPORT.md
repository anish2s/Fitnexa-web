# Phase 2 completion report: admin dashboard

_Prepared 2026-11-18 for the owner's sign-off. Covers milestones 0–5 and the Phase 2 review findings._

## Summary

The admin dashboard is built: every gym gets its own white-labelled dashboard on its subdomain, and
Fitnexa gets a platform console on `admin.`. Milestones 0–5 were each approved from screenshots.
The review findings are fixed:
- **Rate limits:** visitors now get separate allowances, and the forwarded IP can't be forged.
- **Lint:** ESLint is in every workspace and in CI.
- **Flaky e2e:** the root causes are fixed. **Three full e2e runs in a row passed 27/27 each with the
  API's normal rate limits.**
- **Retries, 503, page guards, unit tests:** done; details in the table below.

Not verified live, deferred by your decision: **email delivery (Resend)** and **a live Razorpay test
payment**. The dashboard works without them and says so clearly where they matter.

## Gate items and evidence

Legend: ✅ verified in this pass · ✅ (M*n*) verified when that milestone was approved, recorded in
[PROGRESS.md](PROGRESS.md) · 🟡 built, not verifiable yet.

### Scope (milestones)

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | M0 design system: tokens, components, dark + light, per-gym accent | ✅ (M0) | Approved 2026-11-17; `/design-preview` |
| 2 | M1 sign-in, sessions, gym branding, app shell, Overview, platform gym list | ✅ (M1) + ✅ | Approved 2026-11-18; `e2e/auth.spec.ts` (7 tests) passes in all 3 runs below |
| 3 | M2 members (list, register with consent, profile, edit, archive, photo, CSV import), plans | ✅ (M2) + ✅ | Approved 2026-11-18; `e2e/members.spec.ts` (6) |
| 4 | M3 front desk, check-in, sell/renew, payments, receipts, refunds, renewals | ✅ (M3) + ✅ | Approved 2026-11-18; `e2e/front-desk.spec.ts` (4) |
| 5 | M4 reports, staff, audit log, settings, member data export/erase | ✅ (M4) + ✅ | Approved 2026-11-18; `e2e/owner-tools.spec.ts` (7) |
| 6 | M5 platform console: create/edit/suspend gyms, owner invites, log in as owner, platform audit | ✅ (M5) + ✅ | Approved 2026-11-18; `e2e/platform.spec.ts` (3) |

### Project rules (CLAUDE.md)

| # | Rule | Status | Evidence |
|---|---|---|---|
| 7 | Next.js + TypeScript + Tailwind; React Hook Form + Zod; one data library (TanStack Query) | ✅ | `apps/dashboard/package.json`; clean-copy CI run (below) |
| 8 | npm workspaces: `apps/dashboard`, `packages/ui`, `packages/api-client` (request types generated from the backend's OpenAPI) | ✅ | `package.json`, `packages/api-client/src/schema.d.ts` (`npm run gen`) |
| 9 | No business logic in the frontend; permission checks only hide UI | ✅ | Prices, balances, check-in rules and reports all come from the API. The new server page guards (#20) are on top of the API's checks, not instead of them |
| 10 | Gym branding from `GET /public/tenant` drives CSS variables; dark + light; any gym colour readable (WCAG AA) | ✅ | `lib/brand.test.ts`: all demo colours, plus a sweep of 4,096 colours × 2 themes, all AA. E2E "gym branding comes from the host" and "branding re-themes the app" |
| 11 | White-label: gym screens never show "Fitnexa" | ✅ | E2E asserts no "Fitnexa" on a gym host; the new 503 page has no product name |
| 12 | Access token in memory only; refresh via HttpOnly cookie | ✅ | E2E: empty web storage after reload, HttpOnly refresh cookie, support session leaves nothing in storage |
| 13 | Money is integer paise, formatted at the edge | ✅ | `lib/format.test.ts`: ₹ formatting, Indian grouping, typed rupees to exact paise (`19.99` → 1999), round trips |

### Review findings (fixed in this pass)

| # | Finding | Status | Evidence |
|---|---|---|---|
| 14a | Gym details fetched on every page load | ✅ | Cached per host for 60 s in the Next server; edits through the server clear it (`lib/tenant-cache.ts`, 4 unit tests). Measured through the real stack: 5 page loads, 0 API calls |
| 14b | Visitor IP not forwarded; IP spoofable | ✅ | The Next server overwrites `X-Forwarded-For` with the visitor IP from its trusted hops (`lib/forwarding.ts`, 3 unit tests). The backend's `TRUST_PROXY` now lists the Next server's address and refuses hop counts in production (backend `env.ts`, 2 unit tests). Requirement documented: the API is reachable only through the Next server ([DEPLOYMENT.md](DEPLOYMENT.md); backend `docs/DEPLOYMENT.md`) |
| 14c | Test: two visitors get separate limits | ✅ | Backend `tests/http/app.test.ts`, "client IP behind the Next.js server" (3 tests): visitor A exhausts the limit while visitor B keeps their full allowance; forged `X-Forwarded-For/-Host` from a non-proxy are ignored. Also seen through the real stack: two visitors reported separate `ratelimit` remainders |
| 14d | Not fixed by raising the limit | ✅ | Defaults unchanged (300/min, 10 sign-ins per 15 min); e2e ran with them |
| 15 | ESLint (Next.js + TypeScript) in all workspaces, lint script, every error fixed, in CI | ✅ | Root `eslint.config.mjs`; `npm run lint`: 0 errors, 0 warnings. Fixed: refs read during render and setState in effects (auth, support session, theme toggle, gym list, QR camera), missing effect deps, `watch()` → `useWatch()`. `.github/workflows/ci.yml` runs lint, build, typecheck, unit tests |
| 16 | Flaky `front-desk.spec.ts:96` | ✅ | **Root cause:** on Payments, "Today" silently did nothing if clicked before the gym's date had loaded. **Fix:** the period buttons stay disabled until then, so Playwright waits for them to be enabled (a real UI fix too) |
| 17 | Intermittent owner-tools test | ✅ | It failed on a 10 s URL wait right after "Add member", while `next dev` compiled the next page. E2E now runs against a production build (no compile pauses) |
| 18 | E2E, 3 runs in a row, normal rate limits | ✅ | See "E2E runs" below: 27/27 × 3, no 429s |
| 19 | Don't retry 4xx; error within ~1 s on 5xx | ✅ | `lib/retry.ts`, used by every query: 4xx never retried; 5xx/network retried at most twice (250 ms + 500 ms = 750 ms of waiting). `lib/errors.test.ts` checks every 4xx code and the 1 s bound |
| 20 | HTTP 503 for "can't reach the service" | ✅ | `proxy.ts`. Checked with the API pointed at a dead port: `/login`, `/members` and `/` answer 503 with `Retry-After: 30`, and `/api/*` answers 503 `API_UNAVAILABLE` |
| 21 | Block owner-only / platform-only pages on the server by role, before render | ✅ | `proxy.ts` + `lib/page-rules.ts` (5 unit tests), using a new read-only backend `GET /auth/session` (2 integration tests). Measured: desk staff get **404** on `/staff`, `/audit-log`, `/gyms/new`; the owner gets 200 on owner pages and 404 on `/gyms/*`; `/staff` on the platform host is 404. E2E asserts the 404 status |
| 22 | Unit tests: role → menu, branding contrast, money in paise, API error handling | ✅ | Dashboard: 28 tests in 7 files (`lib/*.test.ts*`) |

### Checks run in this pass

| Check | Result |
|---|---|
| `npm run lint` (all workspaces) | ✅ 0 problems |
| `npm run typecheck` | ✅ |
| `npm test` | ✅ dashboard 28, api-client 11, ui 5 |
| `npm run build` | ✅ |
| CI steps on a clean copy (`npm ci` → lint → build → typecheck → test) | ✅ |
| Backend `npm test` (real MongoDB) | ✅ 411 tests, 39 files |
| Backend typecheck, lint, format check, OpenAPI up to date | ✅ |
| Browser check of changed UI not covered by e2e (theme toggle remembered across reload; member search resets to page 1 and keeps filters) | ✅ |

### E2E runs (normal rate limits)

Setup: production build of the dashboard (`next build` + `next start`). Fresh API on the same
machine with `TRUST_PROXY=loopback` and default limits: 300 requests/min per IP; 10 sign-ins per
account and 30 per gym per 15 min. Seeded database. Installed Chrome, 1 worker, no retries. All
three runs back to back with no restarts in between:

| Run | Started | Result | Time |
|---|---|---|---|
| 1 | 15:35:37 | ✅ 27 passed, 0 failed | 1.5 min |
| 2 | 15:37:08 | ✅ 27 passed, 0 failed | 1.5 min |
| 3 | 15:38:37 | ✅ 27 passed, 0 failed | 1.5 min |

Across the three runs the API served 1,132 requests, with **zero 429 responses**. The busiest
minute was 269 requests (the limit is 300).

Getting there exposed three issues, all fixed:
1. **Sign-in limit:** the suite used to sign in about 14 times per run as one account, over the
   limit of 10. Earlier runs passed only because the test API had `AUTH_RATE_LIMIT_MAX=500`. Each
   account now signs in once per run (`e2e/fixtures.ts`).
2. **Role-check volume:** the new guard first asked the API for the role on every menu-link
   prefetch. It now caches the answer per session cookie for 30 s.
3. **One wasted call per page load:** session restore called `/auth/me` even though the refresh
   response already carries the user. That call is gone, saving one request per page load for
   every user.

Together these took a run from about 720 API calls to about 375. One test also relied on a seeded
member staying on page one of the member list; it now searches for her.

## Known limitations

| # | Item | Effect | What it needs |
|---|---|---|---|
| 1 | **Resend (email) deferred** | Invites, password-reset links, member sign-in links and renewal reminders aren't delivered. The dashboard reports "invite email wasn't sent" with a resend button. The reminder log shows failed/skipped with retry | Resend account, verified domain, API key (Phase 1 report, item 1) |
| 2 | **Razorpay live test payment deferred** | Online payments are built and tested against a simulated Razorpay. The dashboard's "online payments off" (owner) and "not set up" (staff) paths are e2e-tested; a real Checkout round trip is not | Razorpay test account; one test payment |
| 3 | Not deployed | The topology in [DEPLOYMENT.md](DEPLOYMENT.md) must be followed: API private, `TRUST_PROXY` = the Next server's address, `TRUSTED_PROXY_HOPS` = 1 behind Cloudflare. With hops = 0 (development), a visitor could choose their own IP; the server warns at startup in production | Hosting set-up and a smoke test there |
| 4 | Rate limits are per IP | Staff devices sharing one public IP (e.g. gym Wi-Fi) share 300 requests/min. One fast automated browser reached 269/min; normal desk use is far below that | Watch 429s after launch; consider per-user limits for signed-in requests in the backend |
| 5 | Caches are per server instance | With several Next servers, a gym's name/colour/status change reaches the other instances within 60 s, and a revoked session's role within 30 s. The API enforces every change immediately regardless | — |
| 6 | Server guards cover owner-only and console pages | Pages that staff can be granted (e.g. Reports) stay hidden in the app and enforced by the API. A visit without a session cookie passes through to the sign-in screen, which is what lets "log in as owner" tabs work (their token is in memory only) | — |
| 7 | E2E not in CI | It needs the backend and a seeded database; CI runs lint, build, typecheck and unit tests | A CI job that starts the API + MongoDB |
| 8 | Consent wording is a draft | Shown when registering members | Your final text |
| 9 | Screenshots | Desktop / 390 px / both themes were reviewed per milestone. This pass changed no layouts and was verified by tests, not new screenshots | — |

## Changes in this pass

- **fitnexa-web:**
  - IP forwarding and the tenant cache
  - `proxy.ts` (503 and page guards)
  - retry policy
  - ESLint + CI
  - e2e session fixture and the flake fixes
  - `/auth/me` dropped from session restore
  - unit tests
  - docs: README, DEPLOYMENT, PROGRESS, this report
- **fitnexa-backend:**
  - `TRUST_PROXY` takes proxy addresses (hop counts refused in production)
  - `GET /auth/session` (read-only role for the page guards)
  - tests: per-visitor limits, spoofing, env, session role
  - docs: DEPLOYMENT, SECURITY, ARCHITECTURE, API, `.env.example`, OpenAPI regenerated
