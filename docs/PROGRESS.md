# Progress — fitnexa-web (Phase 2: admin dashboard)

Each milestone ends with screenshots and stops for the owner's approval.

| # | Milestone | Status |
|---|---|---|
| 0 | Design system & visual direction (`/design-preview`) | ✅ Approved 2026-11-17 |
| 1 | Foundation: API client, sign-in, sessions, gym branding, app shell, Overview, platform gym list | ✅ Approved 2026-11-18 |
| 2 | Members & plans: list/search, register (with consent), profile, edit/archive, CSV import, plans | ✅ Approved 2026-11-18 |
| 3 | Front desk & money: check-in (QR + manual), sell/renew memberships, payments, receipts, refunds, renewals | 🔨 In progress |
| 4 | Owner tools: reports, staff & permissions, gym settings & branding, audit log, account & sessions | Planned |
| 5 | Platform console: create/suspend gyms, owner invites, "log in as owner", platform audit log | Planned |

Milestones 2–5 are a proposal; scope is confirmed at the start of each.

## Milestone 2 — Members & plans (2026-11-18)

**Built**
- **Members list** (`/members`): each row shows plan, membership status (Active / Expiring / Upcoming /
  Expired / No plan), expiry with days left, and balance due, as in the approved mock-up. Filters:
  membership status and "Has dues"; search by name, phone digits, email or member code; current/archived;
  sort; paging. Search, filters, sort and page live in the URL, so Back from a profile returns to the
  same list. Table on tablet/desktop, stacked rows on phones. Member-app access shown per member.
  (Uses the backend's `membership`/`balanceDuePaise` list fields and `status`/`due` filters, added
  2026-11-18 in fitnexa-backend `a20e7ab`.)
- **Add member** (`/members/new`): name, phone, email, gender, date of birth, join date (back-dating
  allowed), emergency contact, staff notes, and the **consent** step: the front desk reads the wording
  to the member and ticks the box; the API stores time, wording version (`v1`) and who recorded it.
  Duplicate phone/email and every API validation error appear on the right field.
- **Member profile** (`/members/:id`): details, age, current membership (status, dates, days left,
  balance due, renewal already booked), membership history, member-app status and last sign-in,
  consent record, tap-to-call. **Photo** upload (browser → Cloudinary with an API signature) and removal.
- **Edit** (`/members/:id/edit`): sends only changed fields; clearing an optional field sends `null`.
  Removing the email turns the member app off (API).
- **Archive / restore** with confirmation; archived members are read-only until restored.
- **CSV import** (`/members/import`): template download, column guide, drag-and-drop; the API checks
  the whole file first (dry run) and lists problems by spreadsheet row and column; a clean file imports
  after a consent confirmation; all or nothing. Clashes that appear between check and import are shown.
- **Plans** (`/plans`): cards with what the member pays, per-month price, GST breakdown; create/edit
  in a dialog (price in rupees, sent as paise); GST options need the gym's GSTIN (API rule, hinted in
  the form); archive/restore; current/archived.
- Permissions (UI only, API enforces): staff can add and edit members and see plans; import, archive
  and plan management need `members:import`, `members:archive`, `plans:manage` (owner, grantable).
  Screens a user can't use answer 404, as in Milestone 1.
- Shared UI additions: `Textarea`, `Checkbox`; dashboard: `ConfirmDialog`, `RequirePermission`,
  API field-error mapping onto forms. API client: `rawBody` for non-JSON uploads (CSV).

**Verified**
- Unit: api-client 8 tests (+ CSV body); ui 5.
- End-to-end: 13 tests passing (7 from Milestone 1 + 6 new): register with consent and duplicate phone,
  edit, archive/restore, search; member list status/expiry/dues columns and filters; CSV import with row
  errors then a clean import; plans create, duplicate name, edit price, archive/restore; staff
  restrictions; unknown member id. Photo upload/removal checked
  against the configured Cloudinary account.
- Typecheck and production build clean; no horizontal scroll at 390 px (dark and light).

**Owner to review**
- The consent wording (`CONSENT_V1` in `components/members/member-form.tsx`) is a draft in plain
  language. **Open:** the owner will supply the final wording later (2026-11-18); changing it means
  bumping the version in the backend too.

**Notes for the backend**
- ~~`GET /members` items have no membership status, plan, expiry or balance~~ — added in the backend
  (2026-11-18) and used by the list.
- Missing required CSV cells come back as Zod's "Invalid input: expected string, received undefined";
  the dashboard rewrites it to "This cell is empty", but a clearer API message would help other clients.

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
