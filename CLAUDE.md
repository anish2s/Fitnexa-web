# CLAUDE.md — gym-saas-web

Frontends for the multi-tenant Gym SaaS: admin dashboard (Phase 2) and member PWA (Phase 3).
The backend is the separate `gym-saas-api` repo.

## Status: NOT STARTED — do not build yet

Phase 2 starts only after the owner approves the Phase 1 (backend) completion report, and after
the owner approves the visual direction (design system, palette, typography, layouts).
Until then, only update `docs/DESIGN.md` if asked.

## When Phase 2 is approved
- Next.js + TypeScript + Tailwind, React Hook Form + Zod, one data-fetching/caching library.
- Two apps (`apps/dashboard`, `apps/member`) sharing `packages/ui` (design tokens, components)
  and `packages/api-client` (types generated from the backend OpenAPI spec).
- No business logic here: every rule lives in the API. Frontend permission checks only hide UI.
- Each gym's branding (logo, primaryColor, defaultTheme) comes from `GET /api/v1/public/tenant`
  and drives CSS variables; dark + light themes; readable contrast for any gym colour.
- Access token in memory only (never localStorage); refresh via HttpOnly cookie at `/api/v1/auth/refresh`.
- See `docs/DESIGN.md` for the agreed visual direction.
