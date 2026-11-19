# CLAUDE.md — fitexaa-web

Frontends for **Fitexaa**, the multi-tenant gym management SaaS: admin dashboard (Phase 2) and
member PWA (Phase 3). The backend is the separate `fitexaa-backend` repo (`../fitexaa-backend`).

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
  **approved 2026-11-18**.
- Milestone 5 (platform console: create/edit/suspend gyms, owner invites, log in as owner, platform audit log) —
  **approved 2026-11-18**. Phase 2 (admin dashboard) milestones 0–5 complete. Plan and status per milestone: `docs/PROGRESS.md`.
- Phase 2 review findings fixed 2026-11-18 (rate limits per visitor, lint + CI, flaky e2e, retries, 503,
  server page guards, unit tests). Completion report: `docs/PHASE2-REPORT.md`, awaiting the owner's sign-off.
- Stop after each milestone with screenshots and wait for approval before starting the next.

## Rules
- Next.js + TypeScript + Tailwind, React Hook Form + Zod, one data-fetching/caching library.
- npm workspaces: `apps/dashboard` (Phase 2), `apps/member` (Phase 3), shared `packages/ui`
  (design tokens, components) and `packages/api-client` (types generated from the backend OpenAPI spec,
  `GET /api/v1/openapi.json`, also committed as `../fitexaa-backend/docs/openapi.json`).
- No business logic here: every rule lives in the API. Frontend permission checks only hide UI.
- Each gym's branding (logo, primaryColor, defaultTheme) comes from `GET /api/v1/public/tenant`
  and drives CSS variables (`brandVars()` in `packages/ui`); dark + light themes; the contrast
  check keeps any gym colour readable (WCAG AA).
- **White-label:** gym screens show only the gym's name, logo and colour, never "Fitexaa".
  Fitexaa branding appears only on the platform (super admin) side.
- Access token in memory only (never localStorage); refresh via HttpOnly cookie at `/api/v1/auth/refresh`.
- Money from the API is integer paise; format at the edge only.
- See `docs/DESIGN.md` for the agreed visual direction; deployment requirements in `docs/DEPLOYMENT.md`.
- Checks: `npm run lint` (ESLint, Next.js + TypeScript configs, root `eslint.config.mjs`), `npm run typecheck`,
  `npm test`, `npm run build`; CI runs them all. E2E (README) runs against a production build with the
  API's normal rate limits; sign in through `e2e/fixtures.ts` (`signedIn`), not per test.

## How the app is wired (Milestone 1)
- `app/(main)` — the real app. Its root layout resolves the site from the Host header
  (`lib/host-context.ts` → `GET /public/tenant`): gym (white-label branding), platform (Fitexaa),
  unknown gym, or API down. `app/(preview)` — design preview, independent of the API, 404 in production.
- `app/api/[...path]/route.ts` proxies to `API_URL`, overwriting `X-Forwarded-Host` and `X-Forwarded-For`
  (visitor IP from `TRUSTED_PROXY_HOPS`, `lib/forwarding.ts`); the backend's `TRUST_PROXY` must list this server only.
- `lib/tenant-cache.ts`: `/public/tenant` per host, 60 s in memory; the API proxy clears it after gym/branding/platform edits.
- `proxy.ts` (runs before pages render): 503 page when the API is down; 404 for owner-only (`/staff`,
  `/audit-log`) and console (`/gyms/*`) pages by role (`lib/page-rules.ts`, `lib/page-guard.ts` →
  `GET /auth/session`, cached 30 s per cookie). A server layout can't do this: the client app layout
  renders a skeleton on the server, so the response is already 200 before a nested layout runs.
- Query retries: `lib/retry.ts` (never on 4xx; at most 2 quick retries on 5xx/network).
- `lib/auth.tsx` — session state; token only inside `@fitexaa/api-client`; restored on load via
  `/auth/refresh`; cross-tab sign-out via BroadcastChannel.
- Navigation and permissions: `lib/nav.tsx`. Screens not built yet render "planned for Milestone N".
- "Log in as owner": `lib/support-session.ts` (postMessage hand-off) + `app/(main)/support-session` +
  `adoptSupportSession`/`endSupportSession` in `lib/auth.tsx`. The token never touches a URL or storage.
- Icons: `lib/icons.ts` (per-host favicon/apple-touch links in the root layout's metadata, from the
  cached gym lookup), `app/gym-icon` (letter fallback), `app/favicon.ico` (per-host redirect),
  `public/platform/*` (Fitexaa, platform host only). CSP and security headers: `next.config.ts`.
- Response types: add to `packages/api-client/src/responses.ts` (`ResponseMap`) when a screen uses an
  endpoint; the OpenAPI spec only types requests.
