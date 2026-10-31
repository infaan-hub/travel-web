# Skill routing and workflow

## Gate first

Classify the request before choosing a skill. From `next-app/`:

```bash
npm run design:scope -- --route /tours
npm run design:scope:changed
npm run design:scope:strict
```

`scope.json` is the source of truth for routes, file globs, critique cadence, handoff
triggers, and audits. Do not re-derive the tier by eye. Route matching is
specificity-aware (`/company/dashboard` is P3, `/company/acme` is P1), and shared shell or
token files classify as SYSTEM even when they render on a P0 page.

## Load order

1. `travel-ui-design` — always first for UI work. It supplies the feature map, tokens, and
   constraints.
2. `design-critique` — when the task is to evaluate an existing or proposed screen.
3. `design-handoff` — when the task is to produce an implementation spec.

Do not load `design-critique` and `design-handoff` together for the same pass. Critique
first; hand off only after the direction is accepted.

## Where to apply each skill

| Tier | Default critique cadence | Default handoff trigger |
|---|---|---|
| SYSTEM — Tokens, shell, PWA, UI primitives | Every change; check against P0 first | Any token, layout primitive, or shell change |
| P0 — Home, Experiences, Tour detail, Booking | Every change before merge | Any change that another developer implements, or any new state/flow |
| P1 — Companies, company profile, Trips, Auth, Contact, Onboarding | Before launch and after any flow change | New form, new state, or cross-team implementation |
| P2 — Customer bookings, profile, settings | On new flows and after support-reported confusion | New field, status, or destructive action |
| P3 — Company workspace | On new dashboards, tables, or navigation changes | Any table, filter, chart, or permission-dependent action |
| P4 — Admin | On new editors and data-dense screens | Any editor, bulk action, or publish flow |

If a task spans tiers, critique the SYSTEM change against P0 first, then P0. Admin and
company UI should not drive public design decisions.

## Critique workflow

Inputs: a route or URL, a screenshot, or a component path. Add context if known: audience,
stage, and focus area.

1. Run `npm run design:scope -- --route <route>` to confirm the tier, then read the relevant
   feature block in `references/features.md` and the token/layout rules in
   `references/design-system.md`.
2. Inspect the implementation at 390 px and 1440 px at minimum; add 768/1024 for shell or
   grid changes.
3. Evaluate in this order: first impression, usability, hierarchy, consistency,
   accessibility, responsive behavior.
4. Score findings by severity (critical / moderate / minor) and tie each to a concrete
   route, component, token, or breakpoint.
5. Propose the smallest fix that preserves behavior. Do not smuggle in a redesign.
6. Acknowledge what works; call out token drift and missing states explicitly.

Output contract: the structure defined by the `design-critique` skill, plus a short
"Evidence" line per finding naming the route and viewport. Default to a conversation
response. Only write a file under `next-app/docs/design/critiques/` when the user asks for a
persisted report.

## Handoff workflow

Inputs: an approved design, Figma link, screenshot, or a precise description of the intended
change.

1. Identify the feature and tier from the scope gate output and `references/features.md`.
2. List the exact files a developer will touch: route file, page component, CSS Module,
   shared components.
3. Resolve every value to a token in `travel-theme.css`. If a value has no token, mark it as
   a proposed token and say which audit must run.
4. Specify states: default, hover, focus, active, disabled, loading, empty, error, success.
5. Specify responsive behavior at 390, 768, 1024, and 1440 px.
6. Specify content: labels, helper text, validation copy, empty-state copy, truncation.
7. Specify motion: trigger, property, duration, easing, and reduced-motion fallback.
8. Specify accessibility: focus order, labels, roles, announcements, keyboard behavior.
9. List assumptions and open questions instead of inventing product rules.
10. Include a verification checklist using the commands in `references/design-system.md`.

Output contract: the structure defined by the `design-handoff` skill, with a "Files" section
and a "Tokens" section that uses real variable names. When the user wants it persisted,
write to `next-app/docs/design/<feature>-handoff.md`.

## Choosing the entry point

| Situation | Start with |
|---|---|
| "This page feels off" | `design-critique` on the named route |
| "Here is a Figma file" | `design-handoff` for the mapped feature |
| "Build this design" | `travel-ui-design` → implement → `design-critique` before merge |
| "Audit the design system" | `design-handoff` + `npm run audit:theme` / `audit:spacing` |
| "Is this accessible?" | `design-critique` with the accessibility section expanded, then `audit:contrast` |
| "Make it mobile-friendly" | `design-critique` at 390 px, then `audit:layout` |

## Guardrails

- The skills describe and specify; they do not change booking, auth, payment, or data logic.
- Do not invent new routes, fields, or business rules to make a design work. Flag the gap.
- Do not treat a historical report as current. Verify tokens and screens in the repo.
- Do not run destructive scripts, reseed the database, or change migrations for design work.
- If the dev server is unavailable, state which audits were skipped; do not claim they
  passed.
- The gate reports scope; it cannot prove a critique happened. The PR checklist and linked
  critique are the review record. Do not use `--ack` before the review is actually done.
