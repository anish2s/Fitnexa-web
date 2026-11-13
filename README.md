# gym-saas-web

Frontends for the multi-tenant gym management platform:

| App | Path | Phase | Status |
|---|---|---|---|
| Admin dashboard (super admin · gym owner · staff) | `apps/dashboard` | 2 | Not started: waits for Phase 1 approval |
| Member PWA | `apps/member` | 3 | Not started: waits for Phase 2 approval |

Both apps are Next.js + TypeScript + Tailwind and share one design system (`packages/ui`)
driven by each gym's branding tokens.

## Backend
All data and business rules come from **gym-saas-api** over its REST API. This repo holds no
business logic. API types are generated from the backend's OpenAPI spec
(`/api/v1/openapi.json`) rather than copied by hand.

Each gym is served on its own subdomain (`powerhouse.yourapp.in`). The Next.js apps proxy
`/api/*` to the API and forward the original host, so the backend can identify the gym.

## Planned layout
```
gym-saas-web/
├── apps/
│   ├── dashboard/     # Phase 2
│   └── member/        # Phase 3
├── packages/
│   ├── ui/            # design tokens + shared components (dark/light, per-gym accent)
│   └── api-client/    # generated from the backend OpenAPI spec
└── docs/
    └── DESIGN.md      # visual direction agreed so far
```
