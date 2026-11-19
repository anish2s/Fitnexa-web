# Progress — fitexaa-web (Phase 2: admin dashboard)

Each milestone ends with screenshots and stops for the owner's approval.

| # | Milestone | Status |
|---|---|---|
| 0 | Design system & visual direction (`/design-preview`) | ✅ Approved 2026-11-17 |
| 1 | Foundation: API client, sign-in, sessions, gym branding, app shell, Overview, platform gym list | ✅ Approved 2026-11-18 |
| 2 | Members & plans: list/search, register (with consent), profile, edit/archive, CSV import, plans | ✅ Approved 2026-11-18 |
| 3 | Front desk & money: check-in (QR + manual), sell/renew memberships, payments, receipts, refunds, renewals | ✅ Approved 2026-11-18 |
| 4 | Owner tools: reports, staff & permissions, gym settings & branding, audit log, account & sessions | ✅ Approved 2026-11-18 |
| 5 | Platform console: create/suspend gyms, owner invites, "log in as owner", platform audit log | ✅ Approved 2026-11-18 |

Milestones 2–5 are a proposal; scope is confirmed at the start of each.

Phase 2 completion report (every gate item with evidence): [PHASE2-REPORT.md](PHASE2-REPORT.md).

## Per-gym favicons and app icons (2026-11-19)

**Built**
- Gym hosts get the gym's own favicon (32, 48) and apple-touch icon (180): the app icon, else the logo
  (padded square), resized by Cloudinary per size and versioned with `branding.updatedAt`; from the
  existing 60 s per-host cache, so no extra API call. Without either: a letter icon (first letter of the
  gym's name, readable colour on its brand colour) from `GET /gym-icon`, with cache headers.
  `/favicon.ico` sends each host to its own icon. The platform host uses placeholder Fitexaa icons in
  `public/platform/`. Gym hosts never show Fitexaa's icon or name.
- App icon upload in Settings → Branding (owner) and the console's gym → Branding (super admin, signed
  through the new `POST /platform/tenants/:id/uploads/signature`): PNG/JPG/WebP only, ≤ 2 MB, square;
  a non-square image opens a crop dialog (zoom + position) first. The API checks the stored file
  itself (format, size, square) and refuses SVG and other formats; staff can't change branding.
- Content-Security-Policy (plus `nosniff`, referrer policy): Cloudinary images and uploads, Razorpay
  Checkout, blob workers; no framing. See `docs/DEPLOYMENT.md`.

**Verified**
- Dashboard unit: 8 new (`lib/icons.test.ts`: sizes, Cloudinary transformations, logo padding,
  versions, letter fallback, platform icons never on gyms). E2E: 33 passing (+6, `e2e/icons.spec.ts`):
  icons per gym host, fallback icon (PNG, cache headers, 404 on platform), admin icon and
  `/favicon.ico` per host, CSP, upload (SVG refused, non-square cropped, used as favicon, removed;
  real Cloudinary), staff without branding controls. Backend: 6 new (`app-icon.int.test.ts`): raster
  formats only in the signature, SVG/GIF/oversized/non-square refused from Cloudinary's record, foreign
  and fake URLs refused, versioning and old-icon deletion, staff 403, super admin upload; 441 passing.

## Phase 2 review follow-ups (2026-11-18)

- **Rate limits per visitor**: gym details cached per host for 60 s in the Next server (cleared by edits);
  the visitor's IP forwarded on every API call (X-Forwarded-For overwritten, from `TRUSTED_PROXY_HOPS`);
  backend `TRUST_PROXY` now takes the Next server's address(es) and refuses hop counts in production;
  tests prove two visitors get separate limits and that forged headers from elsewhere are ignored.
  Deployment requirement (API reachable only through the Next server) in `docs/DEPLOYMENT.md`.
- **ESLint** (Next.js core-web-vitals + TypeScript) in every workspace, `npm run lint`, CI workflow
  (lint, build, typecheck, unit tests). All findings fixed (React Compiler rules in auth, effects,
  `watch` → `useWatch`, etc.); 0 errors, 0 warnings.
- **Flaky e2e**: Payments "Today" did nothing when clicked before the gym's date had loaded → the
  period buttons are disabled until then (Playwright waits for enabled). Owner-tools timeouts came from
  dev-server compile pauses → e2e runs against a production build. A member-list test depended on a
  seeded member staying on page one → it searches. The suite signs in once per account
  (`e2e/fixtures.ts`) so it passes under the normal sign-in limits; 3 consecutive runs, 27/27 each.
- **Retries**: never on 4xx; 5xx/network at most twice (250 ms, 500 ms), so errors show within ~1 s.
- **API down**: pages answer 503 (+ Retry-After), `/api/*` 503 JSON.
- **Server page guards**: owner-only and console pages 404 before rendering, by the session's role
  (new backend `GET /auth/session`, read-only).
- **Efficiency**: session restore no longer calls `/auth/me` (the refresh response has the user);
  API calls per e2e run fell from ~720 to ~375.
- **Unit tests** (dashboard, 28): role → menu, page rules, branding contrast (incl. a 4,096-colour
  sweep), money in paise, API errors and retry policy, client IP, tenant cache.

## Milestone 5 — Platform console (2026-11-18)

**Built** (platform host, super admin only; gym hosts answer 404)
- **Gyms list**: "New gym", rows open the gym.
- **New gym** (`/gyms/new`): name; web address suggested from the name and checked live
  (available / taken / reserved / invalid); city, phone, email; owner (name, email for the invite,
  phone); brand colour and default theme; Fitexaa subscription (status, plan code, monthly price).
  Result page with the gym's link and whether the owner invite was sent (resend from the gym page).
- **Gym page** (`/gyms/:id`): header with status/subscription, link to the gym's site,
  **Log in as owner**, **Suspend** (reason) / **Reactivate**; tabs: Overview (owners with invite
  status and resend, account counts, subscription, details), Details (the owner's gym form, saved
  through the platform API, plus the subscription), Branding (colour/theme with the contrast preview;
  logo uploads stay on the gym's own site), Audit log (that gym's log).
- **Log in as owner**: reason required (≥ 10 chars). The console opens the gym's site in a new tab;
  that tab says "ready" to its opener; the console checks the message came from that tab at the gym's
  origin, then posts the token to that origin only. The gym tab adopts it in memory (never in the URL or
  storage), confirms with `/auth/me` that it is a support session, and shows the permanent banner. It
  can't be refreshed: a reload, the 15-minute expiry or **End session** ends it for that tab only, without
  touching other tabs or the owner's own sign-in, and shows "Support session ended". Password change,
  sign-out-everywhere and Razorpay changes are blocked in that session (API and UI).
- **Platform audit log** (`/audit-log` on the platform host): console sign-ins.
- **Settings** on the platform host: "My account" (password, devices).
- Super admins have no `role` on `/auth/me`; the console uses `scope: "platform"` and shows "Super admin".

**Verified**
- End-to-end: 27 tests passing (+3): create a gym (address suggestion, reserved address refused),
  edit details, rebrand, suspend (the gym's own login page shows access paused) and reactivate, audit
  entry; log in as owner (reason required, new tab with banner, nothing in web storage, reload ends it,
  password change blocked, End session, audit entry); platform audit log; gym users can't reach console
  pages or start a support session by hand.
- Unit 15; typecheck and production build clean; no horizontal scroll at 390 px.
- One owner-tools test failed once during a full run and passed in 4 re-runs (likely a dev-server
  compile pause); watch for it.

**Notes for the backend**
- `appUrl` (from `GYM_APP_URL_TEMPLATE`) is `http://<slug>.localhost:3000` locally while the dashboard
  runs on another port; the console builds links from the gym's host plus its own protocol/port, which
  is right in production too. Same template feeds the Razorpay webhook URL and invite links: check it in
  production.
- `GET /auth/me` for a super admin has no `user.role` (the type says it's required); consider adding
  `role: "super_admin"`.
- `GET /attendance/report` / dashboard `attendanceToday.rate` can exceed 100% when members whose
  memberships were cancelled the same day have checked in (rate = check-ins ÷ members active now).
- Gyms can't be deleted; e2e runs create `E2E Gym <n>` gyms, which were suspended afterwards.

## Milestone 4 — Owner tools (2026-11-18)

**Built**
- **Reports** (`/reports`, `reports:read`): Revenue (received / refunded / net, by payment method),
  Memberships sold (new vs renewals, value, discounts, cancellations, by plan), Renewals (rate, on time /
  late / not renewed / pending), Attendance (unique members, average per day, busiest hour, by hour and
  weekday), Growth (joined, archived, net change, active members). Ranges: 30 days / 3 months /
  12 months / custom (≤ 366 days, explained if longer); group by auto / day / week / month (the API
  fills empty periods). Charts, totals, period table and **CSV download** of what's on screen.
  On phones, long charts scroll inside their card.
- **Staff** (`/staff`, owner): invite by email (with optional phone) and extra permissions
  (refunds, reports, archive, import, plans, reminder emails), edit, resend invite, deactivate
  (signs them out everywhere) / reactivate. Owners are shown but only changeable by platform support.
  Stacked rows on phones.
- **Audit log** (`/audit-log`, owner): plain-language actions, filter by action (grouped), person and
  dates; each entry expands to field changes (personal values hidden by the API), details, device, IP
  and request id; actions by platform support are flagged.
- **Settings** (`/settings`, tabs by permission):
  - *Gym*: name, email, phone, address, GSTIN, receipt prefix, time zone, renewal reminders (on/off,
    days). Sends only changes; field errors from the API land on the field.
  - *Branding*: logo and app icon upload (browser → Cloudinary, signed by the API), brand colour
    (swatches, picker, hex) with a live dark + light preview using the same contrast rules as the app
    (shows when a colour is adjusted for readability), default theme. Saving re-themes the whole app.
  - *Online payments*: connect Razorpay (step-by-step, webhook URL to copy, events list), status and
    disconnect; duplicate-payment alerts to mark as refunded (`payments:refund`). Blocked while signed in
    as support.
  - *My account* (everyone, incl. staff and super admin): details, change password (wrong current
    password shown on the field), signed-in devices with sign-out per device and "sign out everywhere".
- **Member data (DPDP)** on the member profile (owner, `privacy:manage`): download everything held as
  JSON; erase personal data after typing the member code and a reason (irreversible; financial records
  kept anonymised). Erased members can't be restored.
- Shared image upload helper (member photo + gym logo/icon).

**Verified**
- End-to-end: 24 tests passing (+7): gym settings validation/save/restore; branding colour re-themes
  the app and is restored; staff invite with a grant → edit → deactivate, recorded in the audit log;
  wrong current password; every report loads, CSV downloads, too-long range explained; member export
  and erase with code confirmation; front-desk staff see only "My account" and can't reach owner tools.
- Unit 15 (api-client 10, ui 5); typecheck and production build clean; no horizontal scroll at 390 px.

**Notes for the backend**
- The Razorpay webhook URL in `GET /gym/payment-gateway` uses the backend's configured app URL
  (`http://<gym>.localhost:3000` locally); check it points at the real public host in production.
- Staff can't be deleted, only deactivated (by design); test staff created by e2e runs stay listed as
  deactivated in the FitZone demo gym.

## Milestone 3 — Front desk & money (2026-11-18)

Scope confirmed with the owner: Razorpay online payments included now; QR by camera and USB scanner.

**Built**
- **Front desk** (`/front-desk`): one box for everything. A USB/Bluetooth scanner types the pass
  (`gp1.…`) and Enter checks in; typing a name, phone or member code searches, with a Check-in button
  per result (Enter checks in a single match). **Camera** scanning in a dialog (`qr-scanner`: the
  browser's barcode detector or a worker decoder; camera switch; clear messages for blocked/missing
  cameras). Result card: photo, name, plan, days left; "already checked in" is not an error; refused
  check-ins show why (expired on…, starts on…, no membership) with **Renew / Sell membership**; a balance
  due shows **Collect**. Today panel: check-ins, QR vs manual, share of active members, live list
  (refreshes every 30 s).
- **Sell / renew** (dialog from the profile, front desk and renewals): plan, start date (sell) or
  start rule (renew: automatic / after current ends / today), discount, notes. The API prices the sale
  (discount before GST); step two collects the exact balance, or "Collect later". Overlap conflicts
  explain when the next membership can start.
- **Collect payment**: amount (defaults to the balance), cash / UPI / card / bank with reference,
  "received on an earlier day" (up to 90 days), notes. Every desk payment carries an Idempotency-Key
  kept for retries of the same attempt, so a timeout + retry can't charge twice. Amount above the
  balance is refused on the field. Success shows the receipt number and remaining balance.
- **Pay online (Razorpay)**: creates the order, opens Razorpay Checkout in the gym's colour, verifies
  the payment with the API, shows the receipt. Owners see "Online payments are off" when Razorpay isn't
  connected (button hidden); staff get a clear "not set up" message.
- **Receipts**: PDF opened in a new tab (fetched with the bearer token; falls back to a download if
  pop-ups are blocked).
- **Payments** (`/payments`): today / this month / last month / custom dates, method filter, member
  filter (from a profile), totals received / refunded / net, paging. Payment detail: membership
  balance, reference, refunds, receipt, and **Refund** (`payments:refund`): partial and repeated,
  desk refunds by cash/UPI/bank, online ones through Razorpay; idempotent like payments.
- **Renewals** (`/renewals`): Expiring soon (with the API's WhatsApp link) · Expired · Dues (Collect +
  WhatsApp payment reminder) · Reminder log (`renewals:manage`: renewal emails with retry/cancel).
  WhatsApp opens the gym's own WhatsApp with a prepared message; nothing is sent by the server.
- **Member profile**: Check in, Sell/Renew, Collect; membership history with Collect and **Cancel**
  (reason required); payments (opens the payment detail); recent visits.
- Overview quick actions now go to Add member, Renewals → Dues and Front desk.
- API client: `download()` for files (auth + one refresh on TOKEN_EXPIRED); response types for
  attendance, memberships, payments, refunds, notifications, WhatsApp and the gateway.

**Verified**
- Unit: api-client 10 tests (+ file download with refresh, download errors); ui 5.
- End-to-end: 17 tests passing (+4): sell with discount → part payment by UPI → receipt PDF opens →
  check-in allowed with balance shown → overpayment refused → rest collected → same-day repeat check-in
  → refund with RFND number → cancel with reason; online payment off for owner / "not set up" for staff;
  staff can't refund; invalid pass explained; renewals tabs. A real rotating QR pass (member app token)
  was scanned through the box successfully.
- Typecheck and production build clean; no horizontal scroll at 390 px.

**Not verifiable locally**
- Razorpay Checkout end to end needs the gym's Razorpay test keys (`npm run razorpay:connect` in the
  backend). The order → Checkout → verify path is built per the API docs; the "not connected" path is tested.
- Camera scanning needs a real camera (headless tests use the scanner box).

## Milestone 2 — Members & plans (2026-11-18)

**Built**
- **Members list** (`/members`): each row shows plan, membership status (Active / Expiring / Upcoming /
  Expired / No plan), expiry with days left, and balance due, as in the approved mock-up. Filters:
  membership status and "Has dues"; search by name, phone digits, email or member code; current/archived;
  sort; paging. Search, filters, sort and page live in the URL, so Back from a profile returns to the
  same list. Table on tablet/desktop, stacked rows on phones. Member-app access shown per member.
  (Uses the backend's `membership`/`balanceDuePaise` list fields and `status`/`due` filters, added
  2026-11-18 in fitexaa-backend `a20e7ab`.)
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
  on first paint; Fitexaa branding on the platform host; "Gym not found"; "service unavailable".
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
