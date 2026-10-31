# UI/UX Agent Skills

Skills for the `/design-handoff` and `/design-critique` workflows, plus the project-level
`travel-ui-design` context skill. Installed on **2026-10-31**.

## Installed skills

| Skill | Type | Upstream repo | Upstream path | Commit |
|---|---|---|---|---|
| `design-handoff` | vendored | [`anthropics/knowledge-work-plugins`](https://github.com/anthropics/knowledge-work-plugins) | `design/skills/design-handoff/` | `2574e29377c7173d0cecffef29a6ecbd7f8ccb5d` |
| `design-critique` | vendored | [`anthropics/knowledge-work-plugins`](https://github.com/anthropics/knowledge-work-plugins) | `design/skills/design-critique/` | `2574e29377c7173d0cecffef29a6ecbd7f8ccb5d` |
| `travel-ui-design` | project-specific | this repository | `.github/skills/travel-ui-design/` | — |

Machine-readable provenance for the vendored skills: [`PROVENANCE.json`](PROVENANCE.json).

## Application scope

`travel-ui-design` initializes where the skills apply in this app. The feature map lives in
[`travel-ui-design/references/features.md`](travel-ui-design/references/features.md) and uses
five priority tiers plus the shared SYSTEM tier:

| Tier | Surfaces |
|---|---|
| SYSTEM | Tokens, shell, PWA, UI primitives |
| P0 | Home, Experiences (`/tours`), Tour detail, Booking |
| P1 | Companies, company profile, Trips, Auth, Contact, Onboarding |
| P2 | Customer bookings, profile, settings |
| P3 | Company workspace (dashboard, tours, trips, bookings, analytics, profile) |
| P4 | Admin (dashboards, tables, editors, analytics) |

Default behavior: critique SYSTEM changes against P0, critique P0 before every merge, P1
before launch, and P2–P4 on new flows. Hand off any change that another developer implements,
any new state, and any token or design-system change.

Routing and output contracts are in
[`travel-ui-design/references/skill-routing.md`](travel-ui-design/references/skill-routing.md).
Design tokens and audit commands are in
[`travel-ui-design/references/design-system.md`](travel-ui-design/references/design-system.md).

## Enforcement

The priority table is machine-readable in
[`travel-ui-design/scope.json`](travel-ui-design/scope.json) and consumed by
`next-app/scripts/design-gate.mjs`:

```bash
cd next-app
npm run design:scope -- --route /tours
npm run design:scope:changed
npm run design:scope:strict
```

| Command | Behavior |
|---|---|
| `design:scope` | Report the tier, critique, handoff, and audits for a route or files |
| `design:scope:changed` | Classify changed and untracked files against HEAD |
| `design:scope:strict` | Exit 1 for SYSTEM/P0 changes unless `--ack` is provided |

The gate is route- and file-aware. Static routes beat dynamic routes (`/company/dashboard`
is P3, `/company/acme` is P1), and shared token/shell files classify as SYSTEM. API,
`src/lib`, tests, scripts, Prisma, and docs are ignored by policy.

CI runs the report on every pull request
([`.github/workflows/design-scope.yml`](../workflows/design-scope.yml)) and writes the result
to the job summary. The check is advisory; the PR template
([`.github/pull_request_template.md`](../pull_request_template.md)) records the required
critique or handoff link. Policy changes need
`npx vitest run tests/design-gate.test.ts` in `next-app/`.

OpenCode commands `/design-review` and `/design-spec` run the gate first, then load the
matching skill.

## Licenses

`design-handoff` and `design-critique` are **Apache-2.0**, from
`anthropics/knowledge-work-plugins`. The license text is copied to
[`THIRD_PARTY_LICENSES/anthropic-knowledge-work-plugins-LICENSE`](THIRD_PARTY_LICENSES/anthropic-knowledge-work-plugins-LICENSE).
`travel-ui-design` is original project documentation for this repository.

## Prerequisites

Neither vendored skill requires Figma or any MCP server. They work standalone from a
screenshot, file, or written description. Connecting a Figma MCP server only enriches the
output — for example, pulling exact measurements and tokens instead of asking for them.

## Which agent reads this folder

- **GitHub Copilot**: repository skills are discovered from `.github/skills/<name>/SKILL.md`.
- **OpenCode**: does **not** scan `.github/skills`. It reads
  `.opencode/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md`, or
  `.agents/skills/<name>/SKILL.md` (project level). A local mirror is created at
  `.claude/skills`.
- **Claude Code**: reads `.claude/skills/<name>/SKILL.md`.

## Local changes from upstream

- Copied `design/CONNECTORS.md` to [`CONNECTORS.md`](CONNECTORS.md) and rewrote the two
  `../../CONNECTORS.md` links in the Anthropic skills to `../CONNECTORS.md`.
- No other content changes to the vendored skills.

## Removed

`figma-use-motion` and its required companion `figma-use` were removed on 2026-10-31. They
drive Figma's `use_figma` canvas-write tool, which Figma restricts to paid plans
(Professional, Education, Organization, Enterprise), so they could not be used on the free
Starter plan.

## Updating

Re-download the two Anthropic paths at the desired upstream commit and re-apply the
`CONNECTORS.md` link rewrite. Keep `PROVENANCE.json` in sync. `travel-ui-design` is edited
directly in this repository.
