---
name: travel-ui-design
description: Project UI/UX context for the Travel. app (Next.js 16, Tailwind v4, CSS Modules). Use for any design critique, handoff spec, or UI change on the public discovery and booking surfaces (home, tours, tour detail, booking, trips, companies, auth, contact), customer account pages, company workspace, or admin. Points to the design tokens, layout system, feature map, and audit scripts.
---

# Travel. UI/UX

Project context for design critique, developer handoff, and UI implementation in this
repository. Load this skill before `design-critique` or `design-handoff` so their output
uses this app's real features, tokens, and constraints.

## Scope

In scope: customer-facing public pages, customer account pages, company workspace, staff
workspace, admin UI, and the shared application shell.

Out of scope unless the task is explicitly visual: API routes, Prisma schema, auth and
booking business logic, email templates, infrastructure, and database migrations.

## Read order

1. `next-app/AGENTS.md` — Next.js 16 rules. Read the bundled docs in
   `node_modules/next/dist/docs/` before writing framework code.
2. `scope.json` — machine-readable tiers, routes, file globs, review rules, and ignores.
3. `references/features.md` — feature tiers, routes, entry files, and review focus.
4. `references/design-system.md` — tokens, layout primitives, components, and audit commands.
5. `references/skill-routing.md` — when to use critique vs handoff, and the expected output.

## Feature priorities

| Tier | Surfaces | Why it matters |
|---|---|---|
| SYSTEM | Tokens, shell, PWA, UI primitives | Cross-cutting; a change here lands on every tier |
| P0 | Home, Experiences (`/tours`), Tour detail, Booking | Discovery and conversion; highest design leverage |
| P1 | Companies, company profile, Trips, Auth, Contact, Onboarding | Trust, access, and first-run experience |
| P2 | Customer bookings, profile, settings | Retention and self-service |
| P3 | Company workspace (dashboard, tours, trips, bookings, analytics, profile) | Operator efficiency |
| P4 | Admin (dashboards, tables, editors, analytics) | Internal operations |

Default review order is SYSTEM (checked against P0 first) → P0 → P1 → P2 → P3 → P4. Do not
mix a redesign of one tier with unrelated cleanup in another unless the user asks for a full
pass.

## Skill routing

| Request | Load |
|---|---|
| "Review / critique this screen" | `travel-ui-design` + `design-critique` |
| "Write the spec / handoff for this design" | `travel-ui-design` + `design-handoff` |
| "Implement this design" | `travel-ui-design`, then the relevant feature files |
| "Audit tokens / design system" | `travel-ui-design` + `design-handoff` |

Follow the detailed routing and output contract in `references/skill-routing.md`.

## Enforcement

The priority table is machine-readable in [`scope.json`](scope.json) and enforced by
`next-app/scripts/design-gate.mjs`:

```bash
cd next-app
npm run design:scope -- --route /tours
npm run design:scope:changed
npm run design:scope:strict
```

- `design:scope` reports the tier, critique cadence, handoff trigger, and audits.
- `design:scope:changed` classifies changed and untracked files.
- `design:scope:strict` exits 1 for SYSTEM/P0 changes unless `--ack` records a completed
  review.
- CI runs the report on every pull request and writes a step summary. The PR template
  records the critique/handoff links; the gate itself is advisory.
- Route specificity is respected: `/company/dashboard` is P3, while `/company/acme` is P1.
- API, `src/lib`, tests, scripts, Prisma, and docs are ignored by policy.
- `SYSTEM` is not a route tier. It is the shared shell/token tier that takes precedence over
  the page tier when a file is shared. `src/components/PageHero.tsx` is SYSTEM even though it
  renders on P0/P1 pages.

When changing the policy, edit `scope.json` and run
`npx vitest run tests/design-gate.test.ts`. Keep the table in this skill, `README.md`, and the
PR template in sync.

## Non-negotiables

- **Tokens, not literals.** Use the CSS variables in `src/app/travel-theme.css`; do not add
  raw hex values, ad-hoc shadows, or off-scale spacing. If a token is missing, add it to
  the token file and run `npm run audit:theme`.
- **Keep the styling model.** Page and component styles live in co-located CSS Modules;
  Tailwind v4 utilities are for layout and small adjustments. Do not migrate a feature to
  a different styling system as part of a design task.
- **Preserve behavior.** Do not change booking, auth, payment, or data-fetching logic while
  doing visual work. Route and API contracts stay intact.
- **Accessibility baseline.** 44×44 px minimum tap targets, 4.5:1 body-text contrast,
  visible focus states, labelled form controls, and reduced-motion fallbacks for animation.
- **Responsive by default.** Check 390 px, 768 px, 1024 px, and 1440 px. The shared shell
  is `.page-container` (max 1440 px) with `.page-section` and `.content-grid`.
- **No new dependencies** for a design change without explicit approval. `motion/react`,
  `lucide-react`, `@hugeicons/react`, and the existing UI primitives are available.
- **Real content.** Use realistic tour names, prices, dates, and error states; no lorem
  ipsum in specs or mockups.

## Definition of done

A UI change is complete when:

1. It uses existing tokens and components, or the token change is justified and audited.
2. All relevant states exist: default, hover/focus, active, disabled, loading, empty, error.
3. It works at the four breakpoints above and with reduced motion.
4. `npm run typecheck`, `npm run lint`, and `npm test` pass (or failures are reported).
5. `npm run design:scope:changed` has been run and its tier recorded in the PR checklist.
6. The relevant audit scripts have been run, or the reason they were skipped is stated:
   `npm run audit:contrast`, `npm run audit:layout`, `npm run audit:spacing`,
   `npm run audit:theme`, and `npm run smoke:browser` when a dev server is available.
7. The handoff or critique output names the exact route, files, and tokens it covers.

## Example prompts

```text
Use travel-ui-design and design-critique on /tours at 390px and 1440px.
Focus on filter hierarchy, card scannability, and empty/loading states.
```

```text
Use travel-ui-design and design-handoff for the booking form.
Cover validation errors, disabled submit, success, and mobile keyboard behavior.
```
