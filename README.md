# fitexaa-web

Frontends for **Fitexaa**, the multi-tenant gym management platform:

| App | Path | Phase | Status |
|---|---|---|---|
| Admin dashboard (super admin · gym owner · staff) | `apps/dashboard` | 2 | In progress: Milestone 0 (design system) |
| Member PWA | `apps/member` | 3 | Not started: waits for Phase 2 approval |

Both apps are Next.js + TypeScript + Tailwind and share one design system (`packages/ui`)
driven by each gym's branding tokens. Gym screens are white-label (the gym's own name, logo and
colour); the Fitexaa brand appears only on the platform (super admin) console.

## Backend
All data and business rules come from **fitexaa-backend** (`../fitexaa-backend`) over its REST API.
This repo holds no business logic. API types are generated from the backend's OpenAPI spec
(`/api/v1/openapi.json`) rather than copied by hand.

Each gym is served on its own subdomain (`powerhouse.yourapp.in`). The Next.js apps proxy
`/api/*` to the API and forward the original host (so the backend can identify the gym) and the
visitor's IP (so rate limits are per visitor). Deployment requirements: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Development
Needs the backend running (`../fitexaa-backend`, see its docs/DEVELOPMENT.md) **with
`TRUST_PROXY=loopback`** (the dashboard runs on the same machine), because the dashboard proxies
`/api/*` to it and passes the gym's host in `X-Forwarded-Host` and the visitor's IP in `X-Forwarded-For`.

```bash
npm install
cp apps/dashboard/.env.example apps/dashboard/.env.local   # API_URL of the backend
npm run dev            # dashboard on http://localhost:3000
```
Open a gym by its subdomain (browsers resolve `*.localhost` to your machine):

| URL | Site |
|---|---|
| http://powerhouse.localhost:3000 | Powerhouse Fitness (demo gym) |
| http://fitzone.localhost:3000 | FitZone (demo gym, light theme) |
| http://admin.localhost:3000 | Fitexaa platform console (super admin) |
| http://localhost:3000/design-preview | Design system and mock-ups (sample data; dev only) |

Sign in with the demo accounts printed by the backend's `npm run seed` (e.g. `owner@powerhouse.demo`,
`desk@powerhouse.demo`, `admin@platform.demo`).

### Checks
CI (`.github/workflows/ci.yml`) runs lint, build, typecheck and unit tests on every push.
```bash
npm run lint           # ESLint (Next.js + TypeScript configs) in every workspace
npm run build          # generates route types; run before typecheck on a fresh clone
npm run typecheck      # all workspaces
npm test               # unit tests (dashboard, api-client, ui)
npm run gen -w @fitexaa/api-client   # regenerate API types after backend route/schema changes
```

### End-to-end tests
Against a **production build** of the dashboard (no dev-server compile pauses) and an API with the
demo seed and its **normal rate limits** (don't raise `RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX`). Each
account signs in through the form once per run and later tests reuse that browser session
(`e2e/fixtures.ts`), so the suite stays inside the sign-in limits run after run.
```bash
# API (in ../fitexaa-backend): TRUST_PROXY=loopback, a seeded database, default limits
# Dashboard: a separate build folder, so it can run next to `npm run dev`
cd apps/dashboard
NEXT_DIST_DIR=.next-e2e API_URL=http://127.0.0.1:4000 npx next build
NEXT_DIST_DIR=.next-e2e API_URL=http://127.0.0.1:4000 npx next start -p 3003
E2E_PORT=3003 E2E_PASSWORD='<seed password>' npm run e2e
```
Uses the installed Google Chrome. Records are created in the FitZone demo gym (uniquely named).
The build adds `.next-e2e/types` entries to `tsconfig.json`; don't commit them.

## Layout
```
fitexaa-web/
├── apps/
│   ├── dashboard/     # Phase 2 (Next.js)
│   └── member/        # Phase 3
├── packages/
│   ├── ui/            # design tokens + shared components (dark/light, per-gym accent)
│   └── api-client/    # typed API client; request types generated from the OpenAPI spec
└── docs/
    └── DESIGN.md      # visual direction
```
