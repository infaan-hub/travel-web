## Summary

<!-- What changed, for whom, and why. Link the issue or design. -->

## Design scope

Policy and command reference: [`next-app/docs/DESIGN-REVIEW.md`](next-app/docs/DESIGN-REVIEW.md).
Run this from `next-app/` and paste the matching tier(s):

```bash
npm run design:scope:changed
```

| Tier | Surfaces | Critique | Handoff |
|---|---|---|---|
| SYSTEM | Tokens, shell, PWA, ui primitives | Every change | Any token/layout/shell change |
| P0 | Home, Tours, Tour detail, Booking | Every merge | Any cross-developer change or new state |
| P1 | Companies, Trips, Auth, Contact, Onboarding | Before launch / flow change | New form, state, or cross-team work |
| P2 | Customer bookings, profile, settings | New flows | New field, status, or destructive action |
| P3 | Company workspace | New dashboards/tables/nav | Tables, filters, charts, permissions |
| P4 | Admin | New editors/data-dense screens | Editors, bulk actions, publish flows |

Gate result:

```text
<!-- Paste the design:scope output here. Write "no design scope" if nothing matched. -->
```

- [ ] I ran `npm run design:scope:changed` (or explained why it was skipped).
- [ ] P0/SYSTEM: `design-critique` completed and linked below.
- [ ] Handoff written or linked when the tier requires it.
- [ ] Relevant audits run (`audit:contrast`, `audit:layout`, `audit:spacing`, `audit:theme`, `smoke:browser`), or skips are explained.
- [ ] This PR does not change booking, auth, payment, or data-fetching logic for a visual-only change.
- [ ] No UI change — design scope N/A.

Critique / handoff links:

<!-- Conversation link, docs/design/<feature>-handoff.md, or a short summary. -->

## Verification

<!-- Commands run and results. Note any failures that are pre-existing. -->

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] Checked 390 px and 1440 px (and 768/1024 px for shell or grid changes)

## Notes

<!-- Known gaps, follow-ups, screenshots, or rollout notes. -->
