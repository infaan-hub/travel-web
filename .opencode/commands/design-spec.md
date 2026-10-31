---
description: Classify a route or change set against the P0-P4 design policy, then write a developer handoff spec
---

Produce a Travel. design handoff for: $ARGUMENTS

1. In `next-app/`, run the scope gate:
   - A route: `npm run design:scope -- --route "<route>"`
   - Changed files: `npm run design:scope:changed`
   Read the tier. If it is SYSTEM or P0, also note the strict review requirement.
2. Load the `travel-ui-design` skill, then the `design-handoff` skill.
3. Use `travel-ui-design/references/features.md` to identify the exact route file, page
   component, CSS Module, and shared components.
4. Resolve every value to a token in `src/app/travel-theme.css`. Mark any missing value as a
   proposed token and name the audit that must run after it is added.
5. Cover default, hover, focus, active, disabled, loading, empty, error, and success states;
   responsive behavior at 390, 768, 1024, and 1440 px; content and validation copy; motion
   with a reduced-motion fallback; and keyboard/focus behavior.
6. List assumptions and open questions instead of inventing product rules. Do not change
   booking, auth, payment, or data logic in a handoff.

Default to a conversation response. If a file is requested, write it to
`next-app/docs/design/<feature>-handoff.md` and link the scope gate tier in the header.
End with a verification checklist using the audit commands from
`travel-ui-design/references/design-system.md`.
