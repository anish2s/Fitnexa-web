# fitnexa-web

Frontends for **Fitnexa**, the multi-tenant gym management platform:

| App | Path | Phase | Status |
|---|---|---|---|
| Admin dashboard (super admin · gym owner · staff) | `apps/dashboard` | 2 | In progress: Milestone 0 (design system) |
| Member PWA | `apps/member` | 3 | Not started: waits for Phase 2 approval |

Both apps are Next.js + TypeScript + Tailwind and share one design system (`packages/ui`)
driven by each gym's branding tokens. Gym screens are white-label (the gym's own name, logo and
colour); the Fitnexa brand appears only on the platform (super admin) console.

## Backend
All data and business rules come from **fitnexa-backend** (`../fitnexa-backend`) over its REST API.
This repo holds no business logic. API types are generated from the backend's OpenAPI spec
(`/api/v1/openapi.json`) rather than copied by hand.

Each gym is served on its own subdomain (`powerhouse.yourapp.in`). The Next.js apps proxy
`/api/*` to the API and forward the original host, so the backend can identify the gym.

## Development
Needs the backend running (`../fitnexa-backend`, see its docs/DEVELOPMENT.md) **with `TRUST_PROXY=1`**,
because the dashboard proxies `/api/*` to it and passes the gym's host in `X-Forwarded-Host`.

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
| http://admin.localhost:3000 | Fitnexa platform console (super admin) |
| http://localhost:3000/design-preview | Design system and mock-ups (sample data; dev only) |

Sign in with the demo accounts printed by the backend's `npm run seed` (e.g. `owner@powerhouse.demo`,
`desk@powerhouse.demo`, `admin@platform.demo`).

### Checks
```bash
npm run typecheck      # all workspaces
npm test               # unit tests (api-client, ui)
npm run build
npm run gen -w @fitnexa/api-client   # regenerate API types after backend route/schema changes
```

### End-to-end tests
Against a running dashboard + API with the demo seed. Give the test API a higher sign-in limit so
repeated runs don't hit the rate limit (`AUTH_RATE_LIMIT_MAX=500` in the backend env):
```bash
E2E_PORT=3000 E2E_PASSWORD='<seed password>' npm run e2e -w @fitnexa/dashboard
```
Uses the installed Google Chrome.

## Layout
```
fitnexa-web/
├── apps/
│   ├── dashboard/     # Phase 2 (Next.js)
│   └── member/        # Phase 3
├── packages/
│   ├── ui/            # design tokens + shared components (dark/light, per-gym accent)
│   └── api-client/    # typed API client; request types generated from the OpenAPI spec
└── docs/
    └── DESIGN.md      # visual direction
```
