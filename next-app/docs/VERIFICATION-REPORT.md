# Verification report

Date: 2026-10-20

## Commands and results

| Command | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (26 warnings: `<img>` and effect dependencies) |
| `npm test` | 26/26 tests passed |
| `npm run build` | 62 routes generated successfully |
| `npm run db:verify` | 38/38 checks passed |
| `npm run smoke` | 38/38 checks passed |
| `npm run smoke:browser` | 33/33 checks passed |
| `npm run audit:contrast` | 0 WCAG AA contrast failures (9 pages x light + dark) |
| `npm run test:onboarding` | 16/16 onboarding checks (mobile + desktop) |
| `npm run audit:layout` | 0 layout problems (10 pages, mobile + desktop) |

## Design system

The whole interface was moved to the premium aqua glassmorphism system:
translucent surfaces, frosted blur, hairline borders, three elevation levels and
an automatic dark glass theme, all driven by CSS variables in
`src/app/travel-theme.css`.

## Layout system

A shared shell now controls the whole application: `.page-container`
(max-width 1440px, 24px desktop / 16px mobile padding, horizontal bleed
clipped), `.page-section` (56px vertical rhythm) and `.content-grid`
(12-column grid, 24px gap, single column below 768px). Controls are
standardised to 50px inputs and buttons, 44px minimum tap targets, and cards
share a 4:3 image ratio with equal heights inside a grid row.

## Coverage of the verification

- Record-level database migration, including byte-identical password hashes.
- API authentication, authorization, IDOR, status integrity and review privacy.
- Homepage mutation protection and catalog write permissions.
- Booking creation, cancellation, status transitions and cross-user access.
- Review submission, moderation and public visibility.
- Media upload validation and migrated media delivery.
- Password reset and email verification verified in person (staff issues the code,
  the customer confirms it, a used code cannot be reused).
- Browser rendering and hydration of all public and protected pages.
- Mobile token and refresh endpoints.
- CSRF, rate limiting and upload byte validation.

## Known limitations

- Rate limiting is process-local and is not shared across instances (the shared
  Upstash store is used when `RATE_LIMIT_URL`/`RATE_LIMIT_TOKEN` are set).
- The login limit is 10 attempts per 15 minutes per IP, so repeated local smoke
  runs inside that window return 429 until the process restarts.
- Email sending requires SMTP configuration; without it booking emails return 503.
- Geocoding depends on the external Nominatim service and its rate limits.
- The ported page components are fully typed: every `// @ts-nocheck` directive
  was removed and the project type-checks with `strict: true` and zero errors.
  Shared API payload types live in `src/features/pages/types.ts`.
- WCAG 2.1 AA contrast was audited at runtime in a real browser (text colour
  against the composited background of every text node on nine pages). The
  accent palette, primary buttons, badges and image scrims were adjusted until
  the audit reported no failures.
- Production PostgreSQL, SMTP and Supabase credentials were not available in this
  environment; those paths were validated through configuration and code paths
  rather than live services.

## Spacing pass (2026-10-21)

- `npm run audit:spacing`: 0 sizing/spacing problems (6 viewports, public + admin + customer pages).
- `npm run audit:layout`: 0 layout problems.
- `npm run audit:contrast`: 0 WCAG AA contrast failures.
- `npm run test:onboarding`: 16/16 passed.
- `npm run smoke`: 38/38 passed.
- `npm run smoke:browser`: 33/33 passed.
- `npm test`: 26/26 passed.
- `npm run lint`: 0 errors (28 warnings).
- `npm run typecheck`: 0 errors.
- `npm run build`: compiled successfully.


## Master responsive sizing standards (2026-10-21)

Section 17 of `travel-theme.css` standardises page containers, card tracks, media
ratios, type steps, control heights, hero bands, sidebar metrics, dialogs and
toasts against the shared token set (`--content-max-width`,`--card-padding-*`,
`--grid-gap-*`, `--button-height`, `--input-height`, `--icon-button-size`,
`--destination-image-ratio`/`--featured-image-ratio`).

- `npm run audit:spacing`: 0 problems (6 viewports, public + admin + customer pages).
- `npm run audit:layout`: 0 layout problems.
- `npm run audit:contrast`: 0 WCAG AA contrast failures (light + dark).
- `npm run test:onboarding`: 16/16 passed.
- `npm run smoke`: 38/38 passed.
- `npm run smoke:browser`: 33/33 passed.
- `npm test`: 26/26 passed.
- `npm run lint`: 0 errors (28 warnings).
- `npm run typecheck`: 0 errors.
- `npm run build`: compiled successfully.
- Screenshots reviewed at 320, 390, 768, 1440 and 1920px.


## Header, sidebar account and phone card density (2026-10-21)

- The `Travel.` wordmark and logo are centred in the top header on every
  breakpoint (three-track header grid).
- `Login` / `Register` moved into the sidebar footer; the header only
  carries the account chip of a signed-in traveller.
- Phone layouts (Android / iOS) run two cards per row with a reduced type
  and padding step; copy that cannot read at tile width is dropped.
- `npm run audit:spacing`: 0 problems. `npm run audit:layout`: 0 problems.
- `npm run audit:contrast`: 0 failures. `npm run test:onboarding`: 16/16.
- `npm run smoke`: 38/38. `npm run smoke:browser`: 33/33. `npm test`: 26/26.
- `npm run lint`: 0 errors (28 warnings). `npm run typecheck`: 0 errors.
- `npm run build`: compiled successfully.


## Full-bleed media hero (2026-10-21)

`PageHero` now supports an optional full-bleed background image or muted looping
video plus up to two call-to-action buttons; without media it falls back to the brand
teal gradient. The home hero uses the configured `hero_image_url` with
`Browse Tours` / `Contact Us` calls to action.

- `npm run audit:spacing`: 0 problems. `npm run audit:layout`: 0 problems.
- `npm run audit:contrast`: 0 failures (light + dark).
- `npm run test:onboarding`: 16/16 (hero assertion now checks the brand
  gradient and headline instead of the old panel radius).
- `npm run smoke`: 38/38. `npm run smoke:browser`: 33/33. `npm test`: 26/26.
- `npm run lint`: 0 errors (28 warnings). `npm run typecheck`: 0 errors.
- `npm run build`: compiled successfully.


## Token alignment after the crystal-glass polish (2026-10-21)

The app-wide polish layer had started overriding the Section 16/17 master tokens
(14px phone gutters, 42px buttons, vw-based grid gaps) and lightened muted text
below WCAG AA. The hero scrim was also weak enough that white hero copy failed
contrast over bright photography.

- Page gutters are back on the tokens (28/22/16) at every breakpoint.
- Buttons and compact buttons now honour the 44px minimum tap target.
- Grid gaps come from the grid tokens again (24/18/16).
- Muted text moved from #718096 to #536174/#5B6779 (AA on the light base).
- Hero overlays were strengthened to 0.88/0.66 plus a 0.72/0.52/0.32 gradient,
  and hero search/chips use a dark glass fill so white copy clears AA.
- The auth brand link is a 44px tap target; auth page gutters use the mobile token.

The onboarding test and capture helper now follow the shipped flow: brand splash,
anchored welcome screen with account actions, then the three photo slides. The
assertions keep the same structure (4 collage tiles, 3 stars, 3 dashes, register
destination) and the frame-width rule follows the 1000px stage.

- `npm run audit:spacing`: 0 problems. `npm run audit:layout`: 0 problems.
- `npm run audit:contrast`: 0 failures (32 nodes rely on the image scrim).
- `npm run test:onboarding`: 16/16. `npm run smoke`: 38/38.
- `npm run smoke:browser`: 33/33. `npm test`: 26/26.
- `npm run typecheck`: 0 errors. `npm run lint`: 0 errors (28 warnings).
- `npm run build`: compiled successfully.


## Admin access tooling and login hardening (2026-10-22)

- `scripts/set-admin.ts` (`npm run admin:set`) creates an administrator or resets
  an existing one's password, email, staff flag and active state. This is the
  supported path for restoring access on a deployed database.
- The admin login form trims the username, blocks double submits, shows a
  disabled/signing-in state, exposes a 44px password visibility toggle, and
  signs out a non-staff account instead of leaving a customer session behind.
- `AGENTS.md` is the Next.js-generated agent guidance file.

- `npm run typecheck`: 0 errors. `npm run build`: compiled successfully.
- `npm run audit:spacing` / `audit:layout`: 0 problems; `audit:contrast`: 0
  failures. `npm run test:onboarding`: 16/16. `npm run smoke`: 38/38.
- `npm run smoke:browser`: 33/33 (includes the admin login redirect).
- `npm test`: 26/26. `npm run lint`: 0 errors (28 warnings).

