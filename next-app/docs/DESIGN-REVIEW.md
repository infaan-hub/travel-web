# Design review gate

Travel. uses a tiered design review policy. The machine-readable source of truth is
`.github/skills/travel-ui-design/scope.json`; the classifier is
`next-app/scripts/design-gate.mjs`. The gate tells you which tier a route or file belongs
to and which review it needs. It does not judge the design itself.

## Tiers

| Tier | Surfaces | Critique | Handoff |
|---|---|---|---|
| SYSTEM | Tokens (`globals.css`, `travel-theme.css`), shell, PWA, `components/ui` | Every change; check P0 first, then P3/P4 tables | Any token, layout primitive, or shell change |
| P0 | Home, Tours, Tour detail, Booking | Every change before merge | Any cross-developer change or new state/flow |
| P1 | Companies, Trips, Auth, Contact, Onboarding, tour-company application | Before launch and after flow changes | New form, state, or cross-team implementation |
| P2 | Customer bookings, profile, settings | New flows and support-reported confusion | New field, status, or destructive action |
| P3 | Company workspace and staff view-workspace | New dashboards, tables, or navigation | Tables, filters, charts, permission-dependent actions |
| P4 | Admin dashboards, tables, editors, analytics | New editors and data-dense screens | Editors, bulk actions, publish flows |

SYSTEM is not a route tier. It is the shared token/shell tier and takes precedence when a
file is shared. For example, `src/components/PageHero.tsx` is SYSTEM even though it renders
on P0/P1 pages.

## Commands

Run from `next-app/`:

```bash
# One route
npm run design:scope -- --route /tours

# Several routes
npm run design:scope -- --route / --route /tours --route /booking/abc

# Specific files (comma-separated or repeat --files)
npm run design:scope -- --files src/features/pages/HomePage.tsx,src/app/globals.css

# Changed and untracked files vs HEAD
npm run design:scope:changed

# Compare a branch to a base ref
npm run design:scope -- --changed --base origin/main

# Machine-readable output
npm run design:scope -- --route /company/dashboard --json

# Strict pre-merge check
npm run design:scope:strict
```

Exit codes:

| Code | Meaning |
|---|---|
| `0` | Report produced, no strict violation |
| `1` | Strict tier (SYSTEM/P0) matched without `--ack` |
| `2` | Usage or configuration error, including a missing base ref or scope file |

`--strict` fails only for tiers marked `"strict": true` (SYSTEM and P0). After completing
the critique and recording its link in the PR, re-run with `--ack`:

```bash
node scripts/design-gate.mjs --changed --strict --ack
```

Report mode is the default: it prints the required review and exits 0.

## How classification works

- Routes are normalized: query strings, hashes, trailing slashes, duplicate slashes, route
  groups such as `(public)`, and full URLs are removed.
- Static route segments beat dynamic ones. `/company/dashboard` is P3, while
  `/company/acme` is P1. A route resolves to one tier; the runner-up is shown under
  `alternatives` in JSON output.
- File paths are normalized relative to `next-app/`. Backslashes, repo-relative paths
  (`next-app/src/...`), absolute Windows paths, and `file://` URLs are accepted.
- Shared files may match more than one tier; the highest-ranked tier is primary. The full
  match list is in JSON output.
- Ignored paths include `src/app/api/**`, `src/app/actions/**`, `src/lib/**`,
  `src/context/**`, `src/hooks/**`, `src/types/**`, `tests/**`, `scripts/**`, `prisma/**`,
  `docs/**`, infrastructure, uploads, and tooling config. See `scope.json` for the full list.
- `CompanyForm.tsx` is shared by the public tour-company application (P1) and admin company
  create/detail (P4). It is classified in both tiers, with P1 as the primary because the
  public application is the riskier context. Review both when changing it.

## CI and pull requests

[`.github/workflows/design-scope.yml`](../../.github/workflows/design-scope.yml) runs the
report on every pull request with `fetch-depth: 0`, compares `origin/<base>` to `HEAD`, and
writes the result to the job summary. The check is **advisory**: it warns, it does not block.
The PR template records the tier, the critique/handoff link, and the audits that ran. A
missing checklist entry is a review problem, not a CI failure.

The workflow fails only when the gate cannot run (missing or invalid `scope.json`, broken
script), which is a configuration error.

## Changing the policy

1. Edit `.github/skills/travel-ui-design/scope.json`.
2. Keep `travel-ui-design/SKILL.md`, `travel-ui-design/references/features.md`,
   `.github/skills/README.md`, and the PR template in sync.
3. Run `npx vitest run tests/design-gate.test.ts` in `next-app/`.
4. Spot-check the new route or glob:

   ```bash
   npm run design:scope -- --route /new-route
   npm run design:scope -- --files src/features/pages/NewPage.tsx
   ```

## What the gate does not do

- It does not prove a critique happened. `--ack` and the PR checklist are the record.
- It does not capture screenshots, run Lighthouse, or inspect rendered pages.
- It does not replace `audit:contrast`, `audit:layout`, `audit:spacing`, `audit:theme`, or
  `smoke:browser`; it names the ones the tier needs.
- It does not change code or enforce visual decisions. Use the `design-critique` and
  `design-handoff` skills for that.
