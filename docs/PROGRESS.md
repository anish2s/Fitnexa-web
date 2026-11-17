# Progress — fitnexa-web (Phase 2: admin dashboard)

Each milestone ends with screenshots and stops for the owner's approval.

| # | Milestone | Status |
|---|---|---|
| 0 | Design system & visual direction (`/design-preview`) | ✅ Approved 2026-11-17 |
| 1 | Foundation: API client, sign-in, sessions, gym branding, app shell, Overview, platform gym list | 🟡 Built, awaiting approval |
| 2 | Members & plans: list/search, register (with consent), profile, edit/archive, CSV import, plans | Planned |
| 3 | Front desk & money: check-in (QR + manual), sell/renew memberships, payments, receipts, refunds, renewals | Planned |
| 4 | Owner tools: reports, staff & permissions, gym settings & branding, audit log, account & sessions | Planned |
| 5 | Platform console: create/suspend gyms, owner invites, "log in as owner", platform audit log | Planned |

Milestones 2–5 are a proposal; scope is confirmed at the start of each.

## Milestone 1 — Foundation (2026-11-17)

**Built**
- `packages/api-client`: request types generated from the backend OpenAPI spec (`npm run gen`);
  hand-written response types (`ResponseMap`); fetch client with in-memory token, envelope unwrap,
  `ApiError` (code, field errors, request id), single-flight refresh on `TOKEN_EXPIRED`, `REFRESH_RACE`
  retry, idempotency keys reused across the retry, non-refreshable impersonation tokens.
- Same-origin `/api/*` proxy forwarding `X-Forwarded-Host`, cookies, `Origin` (backend CSRF check).
- Server-side site resolution from the host: gym branding (name, logo, colour, default theme, title)
  on first paint; Fitnexa branding on the platform host; "Gym not found"; "service unavailable".
- Sign in (email or phone + password), forgot password, reset password (also accepts staff/owner
  invites), suspended-gym notice, friendly messages for every auth error code, `?next=` return
  (open-redirect safe).
- Session restore on reload via the HttpOnly cookie, sign-out (also in other tabs), session-expired notice.
- App shell from Milestone 0, navigation filtered by permissions, theme toggle remembered in a cookie,
  support-session banner when `/auth/me` reports `impersonatedBy`.
- Overview on real data: `/dashboard` KPIs; revenue (12 months), growth and attendance reports for
  owners (`reports:read`); recent payments; renewals due with WhatsApp links; dues outstanding.
  Staff see no revenue.
- Platform: gym list with search, status filter and paging (read-only).
- Menu items for later milestones open a "planned for Milestone N" page; owner-only URLs 404 for staff.

**Verified**
- Unit: api-client 7 tests (refresh, single-flight, race, impersonation, errors, query) + compile-time
  checks that wrong bodies/paths fail; ui 5 tests (contrast).
- End-to-end (Playwright, real API + seeded local MongoDB): 7 tests, passing against `next dev` and
  the production build: branding per host, unknown gym, sign-in/`next`/reload/sign-out, no token in
  web storage and HttpOnly cookie, staff restrictions, phone sign-in + gym default theme, platform
  console isolation, reset-link errors.
- Typecheck and production build clean; `npm audit` 0 vulnerabilities; no horizontal scroll at 390 px.

**Notes for the backend**
- The OpenAPI spec types requests only; responses are a generic envelope. Adding response schemas
  would let `ResponseMap` be generated too.
- Local development behind the dashboard needs `TRUST_PROXY=1` (the backend `.env` has `0`).
- The "log in as owner" hand-off (platform → gym host) is designed for Milestone 5; the banner and
  `/auth/impersonation/end` are already wired.
