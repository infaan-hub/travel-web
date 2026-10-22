# Verification report

Date: 2026-10-20

> Historical report, superseded by the Phase 2 verification in
> `DEVELOPMENT.md` §2.6, the Phase 3 company migration verification in
> `DEVELOPMENT.md` §3.3, and the Phase 5 company access verification in
> `DEVELOPMENT.md` §5.2 (2026-10-22). The `db:verify` script referenced below is
> not present in the current `package.json`; current verification uses
> `npm run smoke`, `npm run db:seed:check`, `npm run db:verify:companies`, and the
> audit scripts.

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



## Multi-company Phase 4 — administrator company management (2026-10-22)

Phase 4 adds platform-staff company management on top of the additive Phase 3
schema. It does not reset data, does not delete historical tours or bookings, and
does not add a payment gateway.

- Staff-only company list with server-side search, status/type/region filters and
  pagination; create, edit, logo/cover upload and Leaflet/OpenStreetMap location
  picker with manual coordinate fallback and Nominatim reverse lookup.
- Lifecycle management starts every company `PENDING` and private. Only `ACTIVE`
  companies may be made public; suspend, reactivate and archive all force
  `isPublic = false` where applicable. Archive never deletes the company, tours,
  memberships, bookings or audit history.
- Membership assignment, role changes and revocation are platform-staff only.
  Revocation preserves the row. Cross-company membership IDs return 404.
- Company creation, edits, slug changes, lifecycle changes, uploads and
  membership mutations write company-scoped audit entries.
- The company public link is stored/displayed, but `/company/[slug]/` remains
  Phase 7 scope and intentionally returns 404 for now.

Verification on the final production build:

- `npm run typecheck`: 0 errors.
- `npm test`: 41/41 tests (9 files), including company domain and validation.
- `npm run lint`: 0 errors / 28 pre-existing warnings.
- `npm run build`: succeeded; 85/85 static generation pages.
- `npm run smoke`: 71/71, including company authorization, lifecycle, uploads,
  membership scoping, audit attribution, archived-company booking retention and
  cross-company IDOR denial.
- `npm run smoke:browser`: 44/44, including company list/create/detail at
  390/768/1024/1440 with 0 horizontal overflow and no hydration/page errors.
- `npm run test:onboarding`: 16/16.
- `npm run audit:layout`: 0 problems. `npm run audit:spacing`: 0 problems.
  `npm run audit:contrast`: 0 failures. `npm run audit:theme`: 63/63.
- `prisma migrate status`: 5 migrations found; database schema is up to date.
- Smoke/browser fixtures were removed after the run; local database returned to
  its unseeded baseline (5 users, 0 companies, 0 memberships, 2 legacy unowned
  tours, 0 bookings) with no temporary company upload files.


## Multi-company Phase 5 — company access control (2026-10-22)

Phase 5 adds a single server-side authorization path for company operations. It
does not add a payment gateway, does not mark bookings as paid, and does not
change the booking-request workflow.

- Pure permission matrix: `OWNER` has full company access including membership
  management; `MANAGER` has profile, tour, booking and analytics access without
  membership management; `STAFF` has company context and booking read/update
  only.
- `requireCompanyMember` always re-authenticates the user, reloads active
  membership/role from PostgreSQL, re-checks company status and enforces the
  required permission. Cross-company resources return 404.
- The HTTP-only `active_company` cookie is only a selector. It is validated on
  every request, auto-selected when exactly one active membership exists, and
  rejected when tampered, stale, revoked or suspended.
- `/api/company/context/`, `/api/company/switch/`, profile, tour and booking
  read APIs are implemented. Company scope comes only from the server-resolved
  company id; client `company_id` values cannot widen access.
- `/api/user/` returns navigation-sized active company roles and permissions
  only. Logout clears the active-company cookie with the session.
- `/company/select/` and a minimal protected `/company/dashboard/` shell are
  available with the branded 403 boundary. Full operational UI remains Phase 6.
- Company suspension immediately removes operational access and public presence
  for company-owned tours, including tour detail, availability, gallery,
  reviews, translations, search, booking creation and review creation. Legacy
  unowned tours remain unchanged.

Verification on the final production build:

- `npm run typecheck`: 0 errors.
- `npm test`: 52/52 tests (10 files), including company permission-matrix and
  selector-resolution tests.
- `npm run lint`: 0 errors / 28 pre-existing warnings.
- `npm run build`: succeeded; 93 routes generated.
- `npm run smoke`: 92/92, including role escalation, manipulated company ids,
  revoked memberships, suspended companies, cross-company reads, public tour
  removal and logout cookie clearing.
- `npm run smoke:browser`: 58/58, including anonymous/company-less redirects,
  the multi-company picker, HttpOnly selector, dashboard at 390/768/1024/1440,
  company switching, branded 403 and recovery after suspension.
- `npm run test:onboarding`: 16/16.
- `npm run audit:layout`: 0 problems. `npm run audit:spacing`: 0 problems.
  `npm run audit:contrast`: 0 failures. `npm run audit:theme`: 63/63.
- `prisma migrate status`: 5 migrations found; database schema is up to date.
- Smoke/browser fixtures were removed after the run; local database returned to
  its unseeded baseline (5 users, 0 companies, 0 memberships, 2 legacy unowned
  tours, 0 bookings) with no temporary company upload files.
- Production origin: `https://travelisland.vercel.app` (set `APP_URL` without a
  trailing slash and `AUTH_COOKIE_SECURE=true`).

Remaining warnings and limitations:

- ESLint has 0 errors and 28 pre-existing warnings, mainly `<img>` usage and
  React effect dependencies.
- `npm audit` reports 19 high-severity and 0 critical advisories. The available
  fixes require major-version upgrades; none were applied in Phase 5.
- `experimental.authInterrupts` remains an experimental Next.js flag, required
  for the branded 403 boundary.
- `/company/dashboard/` is only the Phase 5 access shell. Full company
  operational UI is Phase 6; the public `/company/[slug]/` profile is Phase 7
  and currently returns 404.
- No payment gateway was added; booking requests are not marked paid.
- Phase 2–5 changes remain uncommitted.


---

## Multi-company Phase 6 — company dashboard and operations UI (2026-10-22)

Phase 6 adds the company dashboard, tours, bookings, profile and analytics operational UI. It does not add a payment gateway, does not mark bookings as paid, does not change public tour visibility rules, and does not implement the public company directory (Phase 7).

- Company dashboard: company-scoped metrics, upcoming travel, recent bookings/tours, notifications, activity, access summary and company switcher.
- Company tours: create, edit, soft archive, publication control separate from available, itinerary and image management, company-scoped search/status filters and pagination. Client company_id is ignored.
- Company bookings: company-scoped search/status/tour/date filters, operational detail, one-way transitions, preserved history, guest notification and no company-staff deletion. Stale concurrent transitions return 409.
- Profile: delegated fields only; legal identity, registration, status and public visibility remain read-only.
- Analytics: company-scoped metrics and charts using existing Recharts styling/palette.
- Public attribution: TourCard and tour detail expose the operating company badge/link while booking remains available.
- Company navigation, role badge, permission-filtered links and company switch refresh were added to the sidebar and protected company layout.
- CompanyAnalyticsCharts loads dynamically on the client to avoid SSR chart warnings.

Verification on the final production build:

- npm run typecheck: 0 errors.
- npm run lint: 0 errors / 28 pre-existing warnings.
- npm run test: 64/64 (12 files), including authorization, booking integrity, concurrency, notification isolation, historical attribution, validation and company operations.
- npm run build: succeeded; 100 routes generated.
- npm run smoke: 107/107, including Phase 6 profile, tour operations, booking transitions, filters, concurrency, analytics scoping, archive history, page rendering and authorization.
- npm run smoke:browser: 91/91, including company pages at 390/768/1024/1440 with 0 horizontal overflow, public company attribution and no hydration/page errors.
- npm run test:onboarding: 16/16.
- npm run audit:layout: 0 problems. npm run audit:spacing: 0 problems. npm run audit:contrast: 0 failures. npm run audit:theme: 63/63.
- npm run audit:header: 54/57; the 3 failures are a pre-existing stale .top-header-nav selector on a header that renders navigation in the sidebar.
- prisma migrate status: 5 migrations found; database schema is up to date.
- Smoke/browser fixtures were removed after the run; local database returned to its unseeded baseline (5 users, 0 companies, 0 memberships, 2 legacy unowned tours, 0 bookings, 0 notifications) with no temporary company upload files.

Remaining warnings and limitations:

- ESLint has 0 errors and 28 pre-existing warnings, mainly <img> usage and React effect dependencies.
- npm audit reports 19 high-severity and 0 critical advisories. The available fixes require major-version upgrades; none were applied in Phase 6.
- experimental.authInterrupts remains an experimental Next.js flag, required for the branded 403 boundary.
- The public /company/[slug]/ profile remains Phase 7 and currently returns 404.
- No payment gateway was added; booking requests are not marked paid.
- Phase 2-6 changes remain uncommitted.

---

## Multi-company Phase 7 — public company discovery (2026-10-22)

Phase 7 adds public company discovery. It does not add a payment gateway, does
not mark bookings as paid, and does not implement Phase 8 booking changes.

- Public directory `/companies/` with search, business-type and region filters,
  pagination, empty/loading states and company cards.
- Public profile `/company/[slug]/` with branding, description, public contact
  details, map link using stored coordinates only, approved review rating
  summary and published tours.
- Public APIs `/api/companies/` and `/api/companies/[slug]/`.
- Company search integrated into the existing PostgreSQL full-text search.
- "Companies" added to public navigation.
- Public tour cards and detail expose the operating company badge/link while
  booking remains available.
- Suspended, non-public and unpublished company/tour data is excluded.

Verification on the final production build:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- `npm run smoke`: 111/111, including public company discovery, filters,
  profile data, suspended/non-public exclusion and global search.
- `npm run smoke:browser`: 95/95, including directory/profile rendering and
  published tour attribution.
- `npm run test:onboarding`: 16/16.
- Local database returned to its unseeded baseline: 5 users, 0 companies,
  2 legacy unowned tours, 0 bookings.

Remaining warnings and limitations:

- ESLint has 0 errors and 31 warnings, mainly `<img>` usage and React effect
  dependencies.
- `npm audit` reports 19 high-severity and 0 critical advisories.
- `experimental.authInterrupts` remains an experimental Next.js flag.
- Phase 2–7 changes remain uncommitted.

---

## Multi-company Phase 9 — notifications, analytics, and audit integration (2026-10-22)

Phase 9 completes company-aware notifications, analytics and audit integration.

- Company-aware booking notification recipients derived from active company
  memberships.
- Customer receipts and status-change notifications preserved.
- Platform staff notifications preserved.
- Membership, revocation, lifecycle and tour publication notifications.
- In-app notification deduplication by user, tag and title.
- Push failures logged without rolling back business data.
- Audit log API supports company filtering and includes company context.
- Company analytics endpoints remain company-scoped.

Verification on the final production build:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- Local database returned to its unseeded baseline.

Remaining warnings and limitations:

- ESLint has 0 errors and 31 warnings.
- `npm audit` reports 19 high-severity and 0 critical advisories.
- `experimental.authInterrupts` remains experimental.
- Phase 2–9 changes remain uncommitted.

---

## Multi-company Phase 12 — production readiness and final report (2026-10-22)

Phase 12 production readiness and final reporting is complete.

- `npm run vercel-build` passed: migrate deploy, Prisma generate, Next build.
- `prisma migrate status` passed before and after migration.
- `20261024000000_company_domain` applied successfully to Neon.
- `npm run db:verify:companies` passed against Neon.
- Existing users, tours and records were preserved.
- Admin, company and visitor workflows verified.
- Company isolation and auth boundaries verified.
- Media storage limitation documented.

Final verification:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- `npm run smoke`: 111/111.
- `npm run smoke:browser`: 95/95.
- `npm run test:onboarding`: 16/16.
- `npm run audit:layout`: 0 problems.
- `npm run audit:spacing`: 0 problems.
- `npm run audit:contrast`: 0 failures.
- `npm run audit:theme`: 63/63.
- `npm run vercel-build`: succeeded.
- `prisma migrate status`: 5 migrations, up to date.

Project status: complete.
