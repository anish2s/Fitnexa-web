# Design direction (for Phase 2 & 3 — not started)

Recorded from the two reference dashboards you shared on 2026-11-12. To be turned into a full design
system and approved by you before Phase 2 work begins (brief §23 K).

## Base
- **Primary reference: the "Omnix" layout** — calm near-black surface, single accent, compact KPI cards
  with sparkline + trend chip, grouped sidebar (Main / Finance / Account), ⌘K search, recent-activity
  feed, primary "Create new" action.
- **Accents borrowed from "Synaptix"** — segmented quick-action pill (Add member · Record payment ·
  Check-in), soft glow on the active nav item, stronger card hierarchy.
- **Not borrowed:** purple-on-purple gradients, the neon gauge, the "Go Pro" orb, AI-themed widgets
  (brief: no excessive gradients, no fake AI).

## Mapping to the gym owner dashboard
| Reference element | Gym equivalent |
|---|---|
| Total revenue / Active users KPIs | Monthly revenue · Active members · New members · Today's attendance · Pending renewals |
| Revenue growth line | Monthly revenue (12 months) |
| Weekly activity bars | Check-ins per day this week (today highlighted) |
| Recent activity feed | Payment received · New member · Membership expiring · Check-in · Refund |
| Profile/usage card | Gym plan card: members vs plan limit, renewals recovered this month |

## Theme
- **Dark and light themes**, dark by default, per-user toggle.
- Gym owner sets the gym-wide default (`tenant.branding.defaultTheme`: `dark` / `light` / `system`) —
  already in the backend model and returned by `GET /api/v1/public/tenant`.
- **Accent = the gym's `primaryColor`** via CSS variables, never a hard-coded purple. A contrast check
  picks white or near-black text on the accent and darkens/lightens the accent per theme so
  pale or very dark brand colours stay readable (WCAG AA).
- Typography: Inter or Geist; neutral greys for surfaces; one semantic set for success/warning/error/info.
