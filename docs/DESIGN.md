# Design direction — Fitnexa (Phase 2 & 3)

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

## Milestone 0 — design system (built 2026-11-17, awaiting approval)
Live at `/design-preview` (`npm run dev`), with mock-ups at `/design-preview/{owner,members,front-desk,platform}`.
Switch theme and gym colour with `?theme=dark|light&gym=rose|sky`. Screenshots: `docs/design/screenshots/`.

- **Code:** `packages/ui` — `tokens.css` (CSS variables per `[data-theme]`), `theme.css` (Tailwind v4
  theme mapping), `brand.ts` (gym colour → accent tokens), components in `src/components/`.
- **Surfaces (dark, cool blue-tinted — owner request 2026-11-17):** page `#070B12`, card `#0D131D`, raised `#131B27`,
  border `#1E2A3A`; text `#F1F5F9` / muted `#A3AFBF` / subtle `#8593A5`. A soft sky-blue glow (`--bg-glow`,
  two radial gradients at the top of the page, max 22% opacity) sits behind dark pages; light theme has none. **Light:** page `#F6F6F7`, card `#FFFFFF`, border `#E4E4E7`.
- **Accent contrast check (`accentFor`)**: keeps the gym's hue/saturation and moves lightness only as far
  as needed so the fill is ≥ 3:1 against the page, text on the fill is ≥ 4.5:1 (white or near-black,
  whichever is stronger) and accent-coloured text is ≥ 4.5:1. Tested on 14 colours incl. white, black,
  yellow. `#E11D48` is used as-is in both themes; `#0EA5E9` is used as-is on dark (with dark text) and
  darkened to `#0D97D6` on light.
- **Semantic:** success / warning / danger / info, each with fill, text and soft-background tokens per theme.
  Danger buttons use `--danger-solid` (`#DC2626`, 4.8:1 with white).
- **Type:** Geist Sans, tabular numbers. Scale 11 / 12 / 13 / 14 (body) / 16 / 18 / 22 / 28 / 34.
- **Spacing:** Tailwind 4px grid. **Radius:** controls 8px, cards 16px, pills full.
  **Elevation:** dark relies on borders plus a faint top highlight; light uses soft shadows.
- **Components:** Button, Input, Select (native), Table, Card, KpiCard + Sparkline, AreaChart, MiniBars,
  Badge, TrendChip, Modal (native `<dialog>`, bottom sheet on phones), Toast, Skeleton, EmptyState,
  Avatar, ActionPill, Segmented, NavItem.
- **White-label:** gym screens show only the gym's name, logo and colour. Fitnexa's own mark and accent
  (proposed `#6366F1`) appear only in the platform console.
- **Mobile:** sidebar becomes a drawer; list tables become stacked rows; platform table hides
  secondary columns; no horizontal page scroll at 390 px.
