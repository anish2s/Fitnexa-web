# CLAUDE.md — fitnexa-web

Frontends for **Fitnexa**, the multi-tenant gym management SaaS: admin dashboard (Phase 2) and
member PWA (Phase 3). The backend is the separate `fitnexa-backend` repo (`../fitnexa-backend`).

## Status: Phase 2 IN PROGRESS (approved 2026-11-17)

Phase 1 (backend) is approved, with Resend (email) and Razorpay (live test payment) deferred:
the dashboard must work without them and handle their "not configured" errors gracefully.

- Milestone 0 (design system) — **approved 2026-11-17**.
- Milestone 1 (sign-in, sessions, gym branding, app shell, Overview, platform gym list) — **approved 2026-11-18**.
- Milestone 2 (members: list, register with consent, profile, edit, archive, photo, CSV import; plans) —
  **approved 2026-11-18**. Consent wording is a draft; the owner will supply the final text later.
- Milestone 3 (front desk, check-in, sell/renew, payments, receipts, refunds, renewals, Razorpay) —
  **approved 2026-11-18**.
- Milestone 4 (reports, staff, audit log, settings: gym/branding/online payments/account, member data export/erase) —
  **approved 2026-11-18** (committed; pushed together with Milestone 5 at the owner's request).
- Milestone 5 (platform console) — in progress. Plan and status per milestone: `docs/PROGRESS.md`.
- Stop after each milestone with screenshots and wait for approval before starting the next.

## Rules
- Next.js + TypeScript + Tailwind, React Hook Form + Zod, one data-fetching/caching library.
- npm workspaces: `apps/dashboard` (Phase 2), `apps/member` (Phase 3), shared `packages/ui`
  (design tokens, components) and `packages/api-client` (types generated from the backend OpenAPI spec,
  `GET /api/v1/openapi.json`, also committed as `../fitnexa-backend/docs/openapi.json`).
- No business logic here: every rule lives in the API. Frontend permission checks only hide UI.
- Each gym's branding (logo, primaryColor, defaultTheme) comes from `GET /api/v1/public/tenant`
  and drives CSS variables (`brandVars()` in `packages/ui`); dark + light themes; the contrast
  check keeps any gym colour readable (WCAG AA).
- **White-label:** gym screens show only the gym's name, logo and colour, never "Fitnexa".
  Fitnexa branding appears only on the platform (super admin) side.
- Access token in memory only (never localStorage); refresh via HttpOnly cookie at `/api/v1/auth/refresh`.
- Money from the API is integer paise; format at the edge only.
- See `docs/DESIGN.md` for the agreed visual direction.

## How the app is wired (Milestone 1)
- `app/(main)` — the real app. Its root layout resolves the site from the Host header
  (`lib/host-context.ts` → `GET /public/tenant`): gym (white-label branding), platform (Fitnexa),
  unknown gym, or API down. `app/(preview)` — design preview, independent of the API, 404 in production.
- `app/api/[...path]/route.ts` proxies to `API_URL`, setting `X-Forwarded-Host` (backend needs `TRUST_PROXY`).
- `lib/auth.tsx` — session state; token only inside `@fitnexa/api-client`; restored on load via
  `/auth/refresh`; cross-tab sign-out via BroadcastChannel.
- Navigation and permissions: `lib/nav.tsx`. Screens not built yet render "planned for Milestone N".
- Response types: add to `packages/api-client/src/responses.ts` (`ResponseMap`) when a screen uses an
  endpoint; the OpenAPI spec only types requests.
