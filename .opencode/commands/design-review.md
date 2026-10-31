---
description: Classify a route or change set against the P0-P4 design policy, then run a design critique
---

Run a Travel. design review for: $ARGUMENTS

If no route or file is named, review the current uncommitted changes.

1. In `next-app/`, run the scope gate:
   - A route: `npm run design:scope -- --route "<route>"`
   - Changed files: `npm run design:scope:changed`
   - Pre-merge strict check: `npm run design:scope:strict`
   Read the tier and its required critique, handoff, and audits. If the route is
   `/company/dashboard`, the gate must report P3, not P1.
2. Load the `travel-ui-design` skill, then the `design-critique` skill.
3. Use `travel-ui-design/references/features.md` for the feature's job and review focus,
   and `travel-ui-design/references/design-system.md` for tokens, layout, and audits.
4. Inspect the implementation at 390 px and 1440 px; add 768/1024 px for shell or grid
   changes. Use a real screenshot or the running app where possible.
5. Report findings by severity. Tie each one to a route, component, token, or breakpoint.
6. State which audits were run and which were skipped. Do not claim an audit passed unless
   it was executed.

Do not change code unless the request also asks for implementation. If it does, make the
smallest behavior-preserving fix and re-run the gate.

Finish with the scope gate result, the critique findings, and the remaining review items.
