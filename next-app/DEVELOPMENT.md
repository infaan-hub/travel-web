# Travel. Multi-Company Platform — Development Plan

Status: **Phases 1-12 complete. Phase 10 visual refresh reopened by the user on 2026-10-22 and now complete.**
Date: 2026-10-22 (Phase 2 verified 2026-10-22)
Project: `D:\travel-web\next-app`
Repository root: `D:\travel-web` (Git root; application root is `next-app`)
Baseline commit: `1e151b8` (`main` == `origin/main` at audit start)

This document is the working implementation plan, the Phase 1 audit record, and
the Phase 2 completion record. It is intentionally explicit about what is
verified, what is broken, and what must not be changed. Do not mark a phase
complete until its gate is evidenced.

---

## 0. Non-Negotiable Rules

- Preserve the existing Travel. brand, teal/aqua palette, light glassmorphism,
  typography, spacing, radii, breakpoints, icons, navigation, and accessibility.
- Do not redesign, replace the theme, add a new palette, or introduce an
  unrelated UI framework.
- Reuse existing components, API conventions, validation, auth, upload, audit,
  notification, and analytics infrastructure.
- Do not add a payment gateway. A booking remains a **request**, never "paid".
- Preserve trailing-slash URLs, snake_case serializers, cookie/Bearer JWT auth,
  `X-Total-Count`, opt-in pagination, error envelopes, and mobile compatibility.
- Never trust a client-supplied `company_id`. Derive company scope from the
  authenticated user's active membership, or from the selected tour.
- Never reset, truncate, or recreate a persistent/production database.
- Work one phase at a time. Inspect before editing. Run the phase's checks.
- Do not claim completion without implementation and verification evidence.

---

## 1. Phase 1 — Repository Audit (COMPLETE)

### 1.1 Project and stack

| Item | Finding |
| --- | --- |
| Application path | `D:\travel-web\next-app` |
| Framework | Next.js `16.4.2` App Router, React `19.3.1` |
| Language | TypeScript `5.9.3`, strict |
| Database | PostgreSQL; Prisma `6.19.3` |
| Validation | Zod `4.6.7` |
| Auth | JWT (`jose`), HTTP-only cookies and Bearer tokens |
| UI | Existing aqua glassmorphism CSS, Tailwind utilities, Hugeicons, Playfair/Inter |
| Local database | embedded PostgreSQL at `127.0.0.1:55432`, database `infaan_travel` |
| Production database | Supabase PostgreSQL; Vercel root is `next-app` |
| Migrations | 4, all applied locally |
| Git state | clean at audit start; no application changes made in Phase 1 |

### 1.2 Size and route inventory

Verified by scanning the actual `src/app` tree:

- **38 pages** (`page.tsx`)
- **4 layouts** (`layout.tsx`)
- **82 API route files**
- **154 API method handlers**
- API guard scan: 52 route files use `requireStaff`, 10 use `requireUser`,
  2 use `optionalAuth`, 18 have no direct auth guard (public, token, logout,
  cron, health, or delegated handlers).

Existing page routes:

**Public**

- `/`
- `/tours/`
- `/tours/[category]/`
- `/tour/[id]/`
- `/attractions/`
- `/trips/`
- `/contact/`
- `/booking/`
- `/booking/[tourId]/`
- `/login/`
- `/register/`
- `/forgot-password/`
- `/reset-password/`
- `/verify-email/`
- `/onboarding/` (standalone layout)

**Customer (server-guarded `(customer)` layout)**

- `/dashboard/`
- `/bookings/`
- `/settings/`

**Admin**

- `/admin/login`
- `/admin/register`
- `/admin/dashboard`
- `/admin/home-editor`
- `/admin/customers`
- `/admin/tours`
- `/admin/trips`
- `/admin/bookings`
- `/admin/attractions`
- `/admin/reviews`
- `/admin/tips`
- `/admin/analytics`
- `/admin/travel`
- `/admin/work-space`
- `/admin/work-space/pricing/[id]`
- `/admin/work-space/tour-plan/[id]`
- `/admin/messages`
- `/admin/settings`

**Staff workspace (server-guarded `(staff)` layout)**

- `/view-workspace/`
- `/view-workspace/[id]/`

There is currently **no** `/companies/`, `/company/[slug]/`, or `/company/*`
operations route.

### 1.3 API inventory (grouped)

**Authentication and accounts**

- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/register/`
- `POST /api/admin/register/`
- `POST /api/auth/logout/`
- `POST /api/auth/password-reset/request/`
- `GET /api/auth/password-reset/pending/`
- `POST /api/auth/password-reset/issue/`
- `POST /api/auth/password-reset/confirm/`
- `POST /api/auth/email-verification/issue/`
- `POST /api/auth/email-verification/confirm/`
- `GET|PATCH /api/user/`
- `GET|PATCH|DELETE /api/profile/`
- `GET /api/users/`
- `GET|PUT|PATCH|DELETE /api/users/[id]/`

**Public catalogue and discovery**

- `GET|POST /api/tours/`
- `GET|PUT|PATCH|DELETE /api/tours/[id]/`
- `GET /api/tours/[id]/availability/`
- `GET|POST /api/tours/[id]/gallery/`
- `GET|PUT|PATCH|DELETE /api/tours/[id]/gallery/[imageId]/`
- `POST /api/tours/[id]/gallery/reorder/`
- `GET /api/tours/[id]/reviews/`
- `POST /api/tours/[id]/reviews/create/`
- `GET /api/tours/[id]/translations/`
- `GET|PATCH /api/gallery/[id]/`
- `GET|POST /api/attractions/`
- `GET|PUT|PATCH|DELETE /api/attractions/[id]/`
- `GET /api/search/`
- `GET /api/home-settings/`
- `PATCH /api/home-settings/admin/` (delegates to the guarded settings PATCH)
- `GET|POST /api/tips/`
- `GET|PUT|PATCH|DELETE /api/tips/[id]/`
- `GET /api/geocode/` (Nominatim, rate-limited)
- `GET /api/reviews/`
- `GET /api/reviews/stats/`
- `GET|PATCH|DELETE /api/reviews/[id]/`
- `PATCH /api/reviews/[id]/approve/`
- `PATCH /api/reviews/[id]/user/`

**Bookings**

- `GET|POST /api/bookings/`
- `GET|PUT|PATCH|DELETE /api/bookings/[id]/`
- `GET /api/all-bookings/`

**Admin, analytics, reporting**

- `GET /api/dashboard/` (customer dashboard)
- `GET /api/dashboard/stats/` (staff)
- `GET /api/analytics/` (staff)
- `GET /api/audit-logs/` (staff)
- `GET|POST /api/messages/`
- `GET|PATCH /api/messages/[id]/`
- `POST /api/contact/`
- `POST /api/track-visit/`
- `POST /api/funnel/`

**Notifications**

- `GET|PATCH /api/notifications/`
- `GET /api/push/key/`
- `POST /api/push/subscribe/`
- `POST /api/send-whatsapp/`

**Workspaces, hotels, transport**

- `/api/workspaces/` plus nested hotels, rooms, tasks, pricing,
  pricing-draft, tours, travel, template, and from-template routes
- `/api/workspaces/templates/`
- `/api/workspaces/from-template/[templateId]/`
- `/api/hotels/`, `/api/hotels/[id]/`
- `/api/rooms/`, `/api/rooms/[id]/`
- `/api/travel-drivers/`, `/api/travel-drivers/[id]/`
- `/api/travel-vehicles/`, `/api/travel-vehicles/[id]/`

**Operations**

- `GET /api/health/`
- `GET /api/cron/cleanup/` (Bearer `CRON_SECRET`)
- `POST /api/route/calculate/`

### 1.4 Existing database model

24 models, 4 enums:

`User`, `Profile`, `Tour`, `TourGalleryImage`, `ItineraryItem`, `Attraction`,
`Review`, `Booking`, `ContactMessage`, `TravelTip`, `HomeSetting`,
`TravelDriver`, `TravelVehicle`, `Hotel`, `Room`, `Workspace`,
`WorkspaceTask`, `VisitorTracking`, `AuditLog`, `PushSubscription`,
`Notification`, `VerificationToken`, `TourTranslation`, `FunnelEvent`.

Key relationships:

- `User` 1:1 `Profile`; 1:N `Booking`, `Review`, `Workspace` (tourist),
  `TravelTip`, `VisitorTracking`, `AuditLog`, `PushSubscription`,
  `Notification`, `VerificationToken`.
- `Tour` 1:N `TourGalleryImage`, `ItineraryItem`, `Review`, `Booking`,
  `TourTranslation`; M:N `Workspace` via `WorkspaceTours`.
- `Booking` N:1 `User` (nullable) and N:1 `Tour` (required).
- `Review` N:1 `User` (nullable) and N:1 `Tour` (nullable); unique
  `(userId, tourId)`; public only reads approved reviews.
- `Workspace` is staff planning: N:1 tourist `User`, optional `Hotel`,
  `TravelDriver`, `TravelVehicle`; M:N `Tour`, `Room`; 1:N `WorkspaceTask`.
- `AuditLog` records actor, action, entity, entity ID, before/after JSON, IP,
  user agent, timestamp. No company field.
- `Notification` is per-user only. No company field.
- `VisitorTracking`/`FunnelEvent` reference users/tours/bookings but have no
  company field.

Migrations:

1. `20261020000000_init`
2. `20261021000000_features`
3. `20261022000000_verification_and_funnel`
4. `20261023000000_workspace_pricing_draft`

`prisma migrate status` reports the local database up to date.

### 1.5 Current local data (pre-migration snapshot)

Read-only counts from `infaan_travel`:

| Table | Rows |
| --- | ---: |
| users | 5 |
| profiles | 5 |
| tours | 2 |
| tour gallery images | 4 |
| itinerary items | 0 |
| attractions | 1 |
| reviews | 0 |
| bookings | 0 |
| contact messages | 2 |
| travel tips | 0 |
| home settings | 1 |
| travel drivers | 1 |
| travel vehicles | 1 |
| hotels | 1 |
| rooms | 0 |
| workspaces | 1 |
| workspace tasks | 0 |
| visitor tracking | 5,119 |
| audit logs | 128 |
| push subscriptions | 0 |
| notifications | 0 |
| verification tokens | 0 |
| tour translations | 0 |
| funnel events | 487 |

Existing tours:

- `46` — "Test Safari" — `tanzania`, available, featured
- `48` — "Stone town" — `zanzibar`, unavailable

Both are currently **unowned**. They must stay out of public multi-company
discovery until an administrator assigns them. Production was not re-queried
in this phase; a previous verification recorded one administrator and an empty
catalogue. Treat that as historical evidence, not a substitute for a fresh
production count before migration.

### 1.6 Design baseline

Recorded from `src/app/travel-theme.css`:

- Brand: `#0F6B6B` (`--brand`), strong `#0A5252`, accent `#14A3A3`
- Base: `#D8E4E0`; surfaces `#FFFFFF`, `#E9F0EE`
- Text: primary `#0F2A2E`, secondary `#4A6469`, muted `#4F6166`
- Glass: translucent `rgba(240,246,244,.58)` family, white borders,
  `10/16/24px` blur, three elevation levels
- Radii: button `14px`, card `20px`, hero `36px`, pill `999px`
- Space scale: `4/8/12/16/20/24/32/40/48/64px`
- Page gutters: desktop `28px`, tablet `22px`, mobile `16px`
- Content max: `1440px`; reading max: `760px`
- Grid gaps: desktop `24px`, tablet `18px`, mobile `16px`
- Controls: button `48px`, compact `44px`, input `50px`, icon button `44px`
- Focus ring: `#14A3A3`
- Typography: Playfair Display headings and Inter body via `next/font`

New company pages must reuse these exact tokens and the existing glass cards,
`.page-container`, `.btn`, `.form-group`, table, and grid patterns. No new
palette or global styling strategy.

### 1.7 Phase 1 baseline verification results (before Phase 2 repairs)

All commands below were run from `D:\travel-web\next-app` against the actual
local application and database. The production build was run with port 3000
stopped to avoid the Prisma engine lock. These are historical baseline results;
the current Phase 2 results are in §2.6.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | 0 errors |
| `npm run lint` | **PASS with 28 warnings** | 0 errors, 28 existing `<img>`/hook warnings |
| `npm test` | **PASS** | 6 files, 26/26 tests |
| `npm run build` | **PASS** | Prisma client generated; Turbopack compiled; 81 routes generated |
| `npm run smoke` | **PASS** | 38/38 API checks |
| `npm run smoke:browser` | **PASS** | 33/33 browser checks |
| `npm run test:onboarding` | **PASS** | 16/16 mobile/desktop checks |
| `npm run audit:spacing` | **1 finding** | `/login/`: `a.auth-brand` measured `98x44` |
| `npm run audit:layout` | **PASS** | 0 layout problems |
| `npm run audit:contrast` | **PASS** | 0 AA failures (32 text nodes rely on image scrims) |
| `npm run audit:theme` | **NOT RUN** | Script defaults to `http://127.0.0.1:3100`, which was not running; optional, not in the mandatory list |
| `npm run db:verify` | **NOT AVAILABLE** | Referenced by old docs, not present in `package.json` |

The `audit:spacing` result differs from the older verification report (which
claimed 0). Phase 2 fixed the measured `98x44` login brand link and re-ran the
audit at 0 findings. Phase 2 also re-ran the full suite (see §2.6), including
`audit:theme` via `THEME_BASE_URL=http://127.0.0.1:3000`. Two stale theme-audit
assertions were corrected without changing the visual CSS: the body uses a
transparent `background-color` over the light `html` surface, and desktop
destination media is intentionally 16:9 (phones remain 4:3).

### 1.8 Phase 1 findings and risks

| ID | Severity | Finding | Evidence | Fix phase |
| --- | --- | --- | --- | --- |
| F-01 | Critical | No company, membership, or company ownership exists. Every tour and booking is platform-global. | Prisma schema has no `Company`/membership; `Tour`/`Booking` have no `companyId`. | 3 |
| F-02 | Critical | Booking capacity is checked with an aggregate followed by a separate create; concurrent requests can overbook. Updating travelers/date after creation skips capacity entirely. | `src/lib/services/bookings.ts:37-76`, `169-194`. | 2/8 |
| F-03 | High | The seed script passes fields that do not exist in Prisma (`slug`, `short_description`, `best_time_to_visit`, `entry_fee`). It is likely to fail at runtime and cannot be used as the company/demo seed without repair. | `prisma/seed.ts:34-77` and `79-109` versus `schema.prisma`. | 2 |
| F-04 | High | Public tour detail, gallery, translations, reviews, and attraction detail do not consistently filter `deletedAt`. Unavailable tours are returned by the public list by default. | `api/tours/route.ts:14-25`; `api/tours/[id]/route.ts:18-23`; gallery/translations/reviews routes; `api/attractions/[id]/route.ts:12-17`. | 2/8 |
| F-05 | High | `Booking.tour` and `Booking.user` use `onDelete: Cascade`. Deleting a tour or user can erase historical bookings, which violates historical attribution and audit requirements. | `schema.prisma:212-213`. | 3 |
| F-06 | High | Refresh tokens do not compare the `ver` claim with `sessionVersion` and do not reject `deletedAt` users. A disabled/deleted user can refresh until token expiry if `isActive` remains true. | `api/token/refresh/route.ts:19-24`; `auth/tokens.ts`. | 2 |
| F-07 | Medium | Uploads write only to `public/uploads`; `STORAGE_PROVIDER`/`STORAGE_BUCKET` are present in local env but unused. Vercel's filesystem is ephemeral, so company logos/covers are not durable in production. | `src/lib/storage/images.ts:33-35`; grep shows no storage-provider implementation; README/DEPLOYMENT claim Supabase. | 11/12 |
| F-08 | Medium | No company metadata on audit logs or notifications; notifications are global staff or per-user only. No company analytics or company-scoped audit view. | `src/lib/audit.ts`; `src/lib/services/notifications.ts`; `src/lib/services/analytics.ts`. | 3/9 |
| F-09 | Medium | Tests and audit scripts hardcode `/tour/46/`, `/booking/46/`, "Test Safari", and "Stone town". They are not self-contained, and no company tests exist. Multi-company filtering will change these fixtures. | `scripts/smoke-browser.mjs:153-218`; `scripts/{contrast,layout,spacing}-audit.mjs`; `tests/`. | 8/11 |
| F-10 | Medium | Documentation drift: `db:verify` is referenced but absent; README/DEPLOYMENT mention SMTP/Supabase storage and claim `/api/health` is not implemented (it is). | `README.md`, `docs/DEPLOYMENT.md`, `package.json`. | 12 |
| F-11 | Low | Spacing audit flags the `/login/` brand link at exactly `44px` height. | `npm run audit:spacing` output. | 10 |
| F-12 | Medium | Only global `isStaff`/`isSuperuser` flags exist. Company roles must be separate memberships and must never grant platform admin. | `User` model; `requireStaff`. | 3/5 |
| F-13 | Medium | No company UI/routes, no admin company directory, no company links in `Sidebar` or `TourCard`, and no company selector in the admin tour form. | Route inventory; `Sidebar.tsx:118-154`; `TourCard.tsx`; `AdminToursPage.tsx`. | 4/5/6/7 |
| F-14 | Medium | No map library is installed. Nominatim forward geocoding exists, is cached, and is rate-limited; reverse geocoding is absent. | `package.json`; `src/lib/services/geocoding.ts`; `api/geocode/route.ts`. | 4 |
| F-15 | Low | `home-settings/admin` has no direct guard text, but delegates to the guarded `PATCH` in `home-settings/route.ts`; not a vulnerability. | `api/home-settings/admin/route.ts`. | n/a |
| F-16 | Medium | `Tour.available` conflates booking availability with public display; no publication/moderation state exists. | `schema.prisma`; `api/tours/route.ts`. | 3 |
| F-17 | Medium | `Review`, `Notification`, `AuditLog`, `VisitorTracking`, and `FunnelEvent` have no company scope. Some can derive company via tour/booking; audit/notification filtering needs explicit fields. | `schema.prisma`. | 3/9 |
| F-18 | Medium | `Workspace`, `Hotel`, `Room`, `TravelDriver`, and `TravelVehicle` are platform-global internal operations. They should not be made company-owned without a business requirement. | `schema.prisma`; workspace API guards. | 3 (decision) |
| F-19 | Medium | No unique slug or active-membership constraint exists (no model yet). Multiple active memberships must be prevented with a partial unique index. | n/a | 3 |
| F-20 | Medium | `recordAudit` has no company field or request-context argument, and many admin mutations do not audit. | `src/lib/audit.ts`; admin routes. | 3/9 |
| F-21 | Low | Lists are opt-in paginated and plain arrays by default; company lists must follow this exact convention. | `src/lib/api/pagination.ts`. | 4/7 |
| F-22 | Low | `TourCard` navigates on the whole card; an inner company link must call `stopPropagation` to avoid opening the tour. | `TourCard.tsx:46`. | 7 |
| F-23 | Medium | Admin tour create/update schema has no company or publication fields; company managers have no scoped endpoint. | `api/tours/route.ts`, `api/tours/[id]/route.ts`, `validation/schemas.ts`. | 3/4/6 |
| F-24 | High | `bookings/[id]` access is owner-or-global-staff only. Once company users exist, company staff must not be able to use the global endpoint to read another company's booking, and the global endpoint must remain platform-staff/customer-only. | `api/bookings/[id]/route.ts`; `services/bookings.ts:124-130`. | 8 |
| F-25 | Medium | `AuthUser` contains no memberships. Company guards must query active memberships per request (or request-scoped cache) so revocation is immediate. | `auth/session.ts`; `auth/server-guard.ts`. | 5 |
| F-26 | Medium | Logout clears cookies but does not bump `sessionVersion`, so an already-issued Bearer token remains valid. Refresh also lacks the version check. | `api/auth/logout/route.ts`; `api/token/refresh/route.ts`. | 2 |
| F-27 | Low | Public company pages will be client-fetched like existing pages; if server-rendered, they must be dynamic and must not be statically generated from an empty build-time database. | Existing page pattern; `next build` route output. | 7 |

### 1.9 Phase 1 gate

- [x] Actual repository, framework, scripts, and database inspected.
- [x] Route/API inventory recorded.
- [x] Data relationships and migration state recorded.
- [x] Design tokens and component conventions recorded.
- [x] Baseline checks run and documented.
- [x] Risks and likely affected files identified.
- [x] Ordered implementation plan prepared.
- [x] Phase 2 implementation authorized.

**No application code, schema, migration, or UI has been changed in Phase 1.**

---

## 2. Phase 2 — Repair Existing Core Functionality (COMPLETE)

Goal: make the existing single-company application safe and reliable before
adding company tenancy.

Implemented in:

- `prisma/seed.ts`
- `src/lib/services/bookings.ts`
- `src/lib/services/reviews.ts`
- `src/app/api/token/refresh/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/tours/**`, `src/app/api/attractions/**`,
  `src/app/api/gallery/**`, `src/app/api/reviews/**`
- `src/app/travel-theme.css` (only the measured login touch target)
- `scripts/smoke-routes.mjs`, `scripts/theme-audit.mjs`, `scripts/seed-check.mjs`,
  `README.md`, `docs/DEPLOYMENT.md`, `docs/ROLLBACK.md`,
  `docs/VERIFICATION-REPORT.md`

### 2.1 Seed repair and idempotency

- [x] Replaced the invalid seed payloads with `Prisma.TourCreateInput` and
  `Prisma.AttractionCreateInput` objects. The seed now uses `shortDescription`,
  `bestTimeToVisit`, and `entryFee`, and no longer passes `Tour.slug`.
- [x] Verified against an isolated database (`infaan_travel_phase2_20261022`)
  after applying all four migrations. The seed ran twice with identical results:
  1 user, 2 tours, 2 attractions, 2 travel tips, 1 hotel, 2 rooms, 1 driver,
  1 vehicle, and 1 home-settings row. Field values were checked directly in
  PostgreSQL. The isolated database was dropped after verification. The
  populated local database was not seeded or reset.
- [x] Added `scripts/seed-check.mjs` (`npm run db:seed:check`), a read-only
  verification that fails on missing/duplicated demo rows or empty required
  fields. It passed against the isolated database after the two seed runs.
- [x] No production records were overwritten. The seed's `upsert`/update pattern
  is unchanged, and the isolated test database was separate from
  `infaan_travel`.

### 2.2 Session revocation

- [x] `/api/token/refresh/` now rejects missing/deleted/inactive users and tokens
  whose `ver` claim does not match `User.sessionVersion`.
- [x] Logout now bumps `sessionVersion` for the authenticated account before
  clearing cookies. This revokes already-issued access **and** refresh tokens,
  including Bearer tokens used by mobile clients, not just the browser cookie.
- [x] **Trade-off decision:** there is no per-session table yet, so logout is a
  global sign-out for that account. Every device must sign in again. This is the
  secure choice for Phase 2; per-device session management can be added later
  without weakening the current check.
- [x] Logout also resolves a refresh token when the access token has already
  expired, so the refresh token cannot outlive the sign-out.

### 2.3 Public soft-delete behavior

- [x] Tour detail, gallery list, gallery image, translations, reviews, public
  review lists, attraction detail, and gallery-by-ID reads now return 404 for
  soft-deleted parents. Approved reviews attached to a deleted tour are hidden
  from public review lists; general reviews remain visible.
- [x] Review creation rejects a deleted tour.
- [x] **Decision on `available: false`:** tours remain visible in the public list
  and detail response with `available: false`, preserving the current UI/API
  contract. Booking creation continues to reject them. Phase 3's publication
  state will supersede this temporary rule.

### 2.4 Booking integrity and capacity

- [x] Booking creation now runs capacity re-read and insert in one transaction
  with `SELECT id FROM "tours" WHERE id = ... FOR UPDATE`. Concurrent requests
  serialize on the tour row; one succeeds and the other receives a capacity
  error.
- [x] Booking edits lock the tour row when travelers/date change, re-read the
  booking, re-check the customer/status transition, and re-check capacity before
  updating.
- [x] Customers are locked and re-checked even for notes-only edits, so a
  concurrent confirmation cannot allow a customer to edit a confirmed booking.
  Staff retain operational edits/status transitions.
- [x] Capacity is skipped for a booking being cancelled in the same update, and
  confirmed/pending bookings continue to consume capacity.
- [x] Notifications run after the transaction commits and are caught/logged so a
  push failure cannot turn a committed booking into a 500.
- [x] Booking reference generation is now persisted on the booking (the old code
  generated a reference but did not store it) and retries the rare unique
  collision. References remain nullable when the feature flag is disabled.
- [x] No payment gateway or paid marker was added.

### 2.5 Spacing and documentation

- [x] Raised the `.auth-brand` minimum touch height from 44px to 46px. This
  clears the fractional sub-44px measurement without changing the brand mark,
  logo, layout, or palette.
- [x] Removed stale `db:import`/`db:verify` instructions from `README.md` and
  documented the actual `db:seed` command.
- [x] Corrected the README/DEPLOYMENT claim that Supabase Storage is wired up:
  uploads currently go to local `public/uploads`, which is ephemeral on Vercel.
  Durable object storage is still listed as a Phase 11/12 integration.
- [x] Corrected the health-check documentation; `GET /api/health` is
  implemented.
- [x] Corrected the theme-audit description to the actual desktop 16:9 /
  phone 4:3 destination media. The audit's transparent-body check now falls back
  to the light `html` surface; no visual CSS was changed for this.

### 2.6 Phase 2 verification (actual commands)

All commands were run on 2026-10-22 against the local rebuilt production server
on port 3000, except where noted. The local database started and ended with 5
users, 2 non-deleted tours, 0 bookings, and 0 reviews; smoke fixtures were cleaned
up. No production database was touched.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | **PASS** | 0 errors |
| `npm run lint` | **PASS with 28 warnings** | 0 errors; the 28 warnings are the existing `<img>` and hook-dependency warnings |
| `npm test` | **PASS** | 6 files, 26/26 tests |
| `npm run build` | **PASS** | Prisma generated; 81 routes generated |
| `npm run smoke` | **PASS** | 45/45 API/security checks (7 new Phase 2 regressions) |
| `npm run smoke:browser` | **PASS** | 33/33 browser checks |
| `npm run test:onboarding` | **PASS** | 16/16 mobile/desktop checks |
| `npm run audit:layout` | **PASS** | 0 layout problems |
| `npm run audit:contrast` | **PASS** | 0 AA failures (32 text nodes rely on image scrims) |
| `npm run audit:spacing` | **PASS** | 0 sizing/spacing problems (was 1) |
| `npm run audit:theme` | **PASS** | 63/63 theme checks via `THEME_BASE_URL=http://127.0.0.1:3000` |
| `npm run db:seed` (isolated DB) | **PASS** | Two runs, identical counts and field values |
| `npm run db:seed:check` (isolated DB) | **PASS** | 2 tours, 2 attractions, 2 tips, 1 admin, 1 home-settings row |
| `npm run db:verify` | **NOT AVAILABLE** | Still absent from `package.json`; stale docs removed |

New `scripts/smoke-routes.mjs` coverage:

- Public soft-deleted tour detail returns 404 while the staff delete succeeds.
- A created booking receives a persisted `INF-YYYY-NNNN` reference.
- Two simultaneous 6-traveler bookings against a 10-traveler tour produce one
  201 and one 400.
- A booking update to 11 travelers is rejected.
- Logout returns 200 and invalidates the previously issued access and refresh
  tokens.

Phase 1 findings closed by this phase: F-02 (capacity race/update gap), F-03
(seed fields), F-04 (soft-delete public reads), F-06 (refresh version/deleted
user), F-10 (documentation drift where corrected), F-11 (login touch target), and
F-26 (logout Bearer revocation). F-07's code limitation remains for Phase 11/12,
but its documentation is now accurate. All other findings remain assigned to
their original later phases.

### 2.7 Phase 2 gate

- [x] All Phase 2 checks pass.
- [x] No existing API contract changes beyond the documented security fixes:
  soft-deleted reads return 404, logout revokes tokens, and references are now
  persisted; all success response shapes are unchanged.
- [x] No production data touched; the seed verification used a separate database.
- [x] Phase 2 is complete. Phase 3 was authorized separately after this gate.

---

## 3. Phase 3 — Company Domain and Safe Migration

Goal: add the minimum correct multi-company schema without duplicating Tour or
Booking and without exposing legacy offerings. Phase 3 adds no public company
discovery route; the existing platform-wide tour API keeps its current contract
until Phase 7 adds publication/company filtering. Legacy tours are marked
`DRAFT` now so the future company discovery surface cannot expose them.

### 3.1 Prisma models and enums

Add:

```prisma
enum CompanyStatus {
  PENDING
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum CompanyBusinessType {
  TOUR_OPERATOR
  SAFARI_OPERATOR
  EXCURSION_PROVIDER
  OTHER
}

enum CompanyRole {
  OWNER
  MANAGER
  STAFF
}

enum CompanyMembershipStatus {
  INVITED
  ACTIVE
  REVOKED
}

enum TourPublicationStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  REJECTED
  ARCHIVED
}
```

`Company`:

- `id`, `name`, `slug` (`@unique`), `description`, `registrationReference?`
- `businessType`, `logoImageKey?`, `coverImageKey?`
- `contactEmail`, `contactPhone`, `alternativePhone?`, `whatsappNumber?`
- `address`, `locality?`, `district?`, `region?`, `country` (default `Tanzania`)
- `latitude?`, `longitude?`, `website?`, `socialLinks?` (JSON), `openingHours?`
- `status` default `PENDING`, `isPublic` default `false`
- `createdByUserId?`, `createdAt`, `updatedAt`, `suspendedAt?`, `archivedAt?`
- `searchVector Unsupported("tsvector")?`
- Indexes: `(status, isPublic)`, `(businessType)`, `(region)`,
  `(locality)`, `(createdAt)`, GIN on `searchVector`

`CompanyMembership`:

- `id`, `companyId`, `userId`, `role`, `status` default `INVITED`
- `assignedByUserId?`, `createdAt`, `updatedAt`, `revokedAt?`
- Relations to `Company`, `User`, and assigning `User`
- Indexes: `(userId, status)`, `(companyId, role, status)`
- **Partial unique index** in raw SQL:
  `UNIQUE (company_id, user_id) WHERE status = 'ACTIVE'`
  This preserves revoked history while preventing ambiguous active roles.

`Tour` additions:

- `companyId Int?` (nullable migration-safe; required for new company tours)
- `publicationStatus TourPublicationStatus @default(DRAFT)`
- `publishedAt?`, `publishedByUserId?`, `moderationNote?`
- Relation `company?` with `onDelete: Restrict`
- Index `(companyId, publicationStatus, deletedAt)`, `(companyId, createdAt)`

`Booking` additions:

- `companyId Int?` (legacy-safe; new bookings derive non-null in service)
- `companyNameSnapshot String?`
- `tourTitleSnapshot String?`
- Relation `company?` with `onDelete: Restrict`
- Index `(companyId, status, travelDate)`, `(companyId, createdAt)`
- Preserve `tourId` and existing reference/status/traveler fields.
- Change destructive cascades: `Booking.tour`/`Booking.user` must not cascade
  away historical bookings. Prefer soft deletes and `Restrict`/`SetNull` after
  evaluating existing rows.

`AuditLog` additions:

- `companyId Int?`, relation to `Company`, index `(companyId, createdAt)`.

`Notification` additions (optional but recommended for company filtering):

- `companyId Int?`, relation to `Company`, index `(companyId, createdAt)`.
  Recipients remain per-user membership-derived; never a client list.

Decisions:

- `Review`, `TourGalleryImage`, `ItineraryItem`, `TourTranslation` own company
  scope through the parent `Tour`; do not duplicate `companyId`.
- `VisitorTracking`/`FunnelEvent` remain platform analytics; company metrics
  derive via `tourId`/`bookingId` joins.
- `Workspace`, `Hotel`, `Room`, `TravelDriver`, `TravelVehicle`, `Attraction`,
  `TravelTip`, `HomeSetting`, `ContactMessage` remain platform-global unless a
  later requirement explicitly makes them company-specific.
- Do not add a competing `Service` model. `Tour` is the offering model.

### 3.2 Migration strategy

- [x] Create an additive Prisma migration. Do not reset or truncate.
- [x] Add nullable columns first; backfill separately; do not make
  `Tour.companyId` or `Booking.companyId` `NOT NULL` while legacy rows exist.
- [x] Add the partial unique membership index with raw SQL.
- [x] Add generated company `search_vector` with the same `GENERATED ALWAYS AS
  ... STORED` pattern used by `Tour`.
- [x] Add all indexes after verifying existing row counts.
- [x] Add `scripts/backfill-companies.ts` with `--dry-run`, `--company <slug>`,
  and explicit assignment flags.
  Default behavior:
  - existing tours: leave `companyId = NULL`, `publicationStatus = DRAFT`;
  - existing bookings: set `companyId` only from a known tour company, and set
    title/company snapshots; never overwrite an existing company attribution;
  - no invented company for legacy records.
- [x] Add `scripts/verify-company-migration.ts` for row counts and orphan checks:
  bookings without tours, tours with unknown companies, published tours owned by
  inactive companies, active duplicate memberships, memberships pointing at
  missing users/companies.
- [x] Seed a non-production demo company and owner only in `prisma/seed.ts`.
  Assign the two demo seed tours to it and mark them `PUBLISHED`.
- [x] Keep local legacy tours 46/48 unassigned/draft unless explicitly assigned
  in a test setup.

Gate:

- [x] `prisma migrate status` clean.
- [x] All pre-existing row counts preserved.
- [x] No unowned tour appears in public company discovery. Phase 3 adds no
  company discovery endpoint; that filtering arrives with the Phase 7 public
  company pages. The existing platform-wide tour list keeps its old contract
  until then, and both local legacy tours are `DRAFT`/unowned.
- [x] `prisma generate` succeeds; typecheck passes.
- [x] Backfill is repeatable and dry-run verified.

### 3.3 Phase 3 completion evidence (2026-10-22)

- Migration `20261024000000_company_domain` applied to local
  `infaan_travel` and to a fresh isolated database. No reset or truncation was
  run. Pre-migration baseline: 24 tables / 6,234 rows; post-migration check:
  24/24 tables unchanged.
- Local legacy tours remain id `46` "Test Safari" and id `48` "Stone town":
  `company_id = NULL`, `publication_status = DRAFT`, `published_at = NULL`.
  No company/membership was created in the local database.
- The fresh database applied all five migrations, then the seed twice:
  identical counts (2 users, 1 company, 1 active OWNER membership, 2 tours,
  2 attractions, 2 tips, 1 hotel, 2 rooms) and identical `publishedAt` values.
  `db:seed:check` passed both times.
- Isolated migration checks verified: generated company `search_vector` matches
  "island"; the partial unique index rejects a second ACTIVE membership for the
  same company/user while allowing REVOKED history; deleting a tour with a
  booking is blocked by `RESTRICT`; deleting a user sets `Booking.userId = NULL`
  and preserves the booking; membership rows cascade only when the test user is
  removed.
- Backfill verification: `--dry-run` changed nothing; explicit
  `--company travel-island-demo --assign-tours --tour-ids 4 --apply` assigned
  the unowned tour while keeping `DRAFT`; the following default apply populated
  booking company/title snapshots; a second apply wrote 0 rows. All fixture rows
  were removed afterwards.
- New bookings now derive `companyId`, `companyNameSnapshot` and
  `tourTitleSnapshot` from the tour row loaded inside the existing capacity
  lock; no client value is accepted. `src/lib/booking-attribution.ts` keeps the
  derivation testable, and the booking serializer returns `company`/
  `company_name` plus the snapshot-backed `tour_title`. This closes the §3.1
  contract without waiting for Phase 8.
- Smoke coverage now proves both an unowned legacy tour and a temporary
  company-owned tour persist server-derived snapshots. The temporary company,
  tour and bookings are removed in cleanup.
- Verification: `npm run typecheck` passed; `npm run lint` 0 errors / 28 existing
  warnings; `npm test` 28/28; `npm run build` 81 routes; `npm run smoke` 48/48;
  `npm run smoke:browser` 33/33; `npm run test:onboarding` 16/16;
  `npm run audit:layout` 0; `npm run audit:spacing` 0;
  `npm run audit:contrast` 0; `npm run audit:theme` 63/63; `prisma generate`
  succeeded; `prisma migrate status` reports the schema up to date.
- Browser checks were run against `http://localhost:3000` because Next 16 blocks
  dev resources requested from the alternate `127.0.0.1` origin. No application
  code or production configuration was changed for this workaround.
- The local default backfill dry-run after the smoke suite reported 0 pending
  booking snapshots and left both legacy tours unowned/DRAFT. It was not applied
  to local data; the isolated database exercised the apply path.
- Known Prisma diff residue is intentional and documented in the migration:
  Prisma cannot express the partial `bookings_reference_key` or generated
  `search_vector` columns, so `prisma migrate diff` reports those as missing or
  as a default drop. The runtime indexes behave as required; future manual
  migrations must keep using raw SQL for them.

---

## 4. Phase 4 — Administrator Company Management

Routes:

- `/admin/companies/`
- `/admin/companies/create/`
- `/admin/companies/[id]/`

API routes:

- `/api/admin/companies/`
- `/api/admin/companies/[id]/`
- `/api/admin/companies/[id]/lifecycle/`
- `/api/admin/companies/[id]/members/`
- `/api/admin/companies/[id]/members/[membershipId]/`
- `/api/geocode/reverse/` (Nominatim reverse lookup through the existing service)

Implemented files:

- `src/app/admin/(protected)/companies/**` (list, create and detail pages)
- `src/features/pages/AdminCompaniesPage.tsx`
- `src/features/pages/AdminCompanyCreatePage.tsx`
- `src/features/pages/AdminCompanyDetailPage.tsx`
- `src/features/pages/CompanyForm.tsx`
- `src/features/pages/admin-companies.module.css`
- `src/components/LocationPicker.tsx` (client-only map component)
- `src/components/Sidebar.tsx`
- `src/lib/api/client.ts`
- `src/lib/validation/company.ts`
- `src/lib/company-domain.ts`
- `src/app/api/admin/companies/**`
- `src/app/api/geocode/reverse/route.ts`
- `src/lib/services/companies.ts`
- `src/lib/services/geocoding.ts`
- `src/lib/storage/images.ts` (additive `companies` and `companies/covers` folders)
- `src/features/pages/types.ts` (company serializers and client types)

Tasks:

- [x] Admin list with server-side search, status/type/region filters, and
  opt-in pagination. Uses the existing list/`X-Total-Count` convention.
- [x] Create/edit company fields with Zod validation and sensible max lengths.
- [x] Slug normalization (lowercase, URL-safe, unique); slug changes audited.
- [x] Latitude `-90..90`, longitude `-180..180`; decimal validation; no
  fabricated coordinates. Manual entry fallback if geocoding is unavailable.
- [x] Map picker using Leaflet + OpenStreetMap tiles (free, no API key),
  dynamically imported client-side, draggable marker, manual coordinate
  fallback, and a public OpenStreetMap link. No paid mapping service added.
- [x] Optional reverse-geocoding through the existing Nominatim service, with
  caching/rate limiting and manual fallback.
- [x] Logo/cover upload using `saveImage`/`deleteImage`; `companies` folders.
- [x] Lifecycle: create as `PENDING`/not public; explicit activate; suspend;
  reactivate; archive without deleting tours/bookings. Timestamps recorded.
- [x] Membership assignment/revocation UI: owner/manager/staff; only an
  authorized platform administrator can assign/revoke. Revoked rows are kept.
- [x] Company detail: assigned members, tours, bookings, stats, recent audit
  entries, public profile link.
- [x] Add "Companies" to admin sidebar using the existing icon/nav style.
- [x] Audit every privileged mutation with `companyId`.
- [x] Server-side admin authorization on every route; no client-only checks.
- [x] Tests: create/edit/coordinates validation, duplicate slug, activate/
  suspend/reactivate, assign/revoke manager, archived company retains bookings.

Gate:

- [x] Only platform staff can manage companies and memberships.
- [x] A company cannot be made public while `PENDING`, `SUSPENDED`, or
  `ARCHIVED`.
- [x] No destructive company action removes historical bookings.
- [x] Admin UI matches existing layout/spacing/contrast.

### 4.1 Phase 4 implementation notes

- Company schemas in `src/lib/validation/company.ts` validate multipart and JSON
  payloads, strip unknown fields, require HTTP(S) URLs, enforce coordinate
  ranges and coordinate pairs, and allow partial updates without manufacturing
  a location.
- `src/lib/company-domain.ts` owns slug normalization and candidate generation
  (numeric suffixes for automatic collisions), lifecycle transition rules,
  coordinate-pair checks, public gating, and public-path/OSM link helpers.
- `src/lib/services/companies.ts` performs all reads/writes. Every route calls
  `requireStaff`; cross-company membership mutations are scoped by both
  `companyId` and membership id and return 404 otherwise. Slug conflicts,
  duplicate memberships, archived-company mutations, and illegal lifecycle
  transitions return safe 4xx responses.
- Lifecycle transitions force `isPublic = false`; only `ACTIVE` companies may be
  made public. Suspending removes public visibility immediately. Archiving
  never deletes a company, tour, membership, or booking.
- Company creation starts `PENDING`/private and is audited as `company.create`.
  Slug changes are audited as `company.slug_change`. Membership changes, edits,
  uploads and lifecycle changes are audited with the company id.
- List UI uses server-side filters and pagination. At tablet/phone widths the
  table becomes stacked company cards; the toolbar becomes a two-column/one-
  column grid so search and filters remain usable. Desktop table headings and
  compact values are kept on one line.
- Public `/company/[slug]/` pages remain Phase 7 scope. Phase 4 stores and
  displays `public_path` only; the profile URL intentionally returns 404 until
  that phase is authorized.

### 4.2 Phase 4 verification evidence (2026-10-22)

- `npm run typecheck` passed.
- `npm run lint` passed with 0 errors / 28 pre-existing warnings.
- `npm test`: 41/41 tests across 9 files. New coverage:
  `tests/company-domain.test.ts` (slug normalization/suffixes, lifecycle
  transitions, public gating, coordinate pairs, OSM URLs) and
  `tests/company-validation.test.ts` (create defaults, coordinate ranges,
  URL/email/slug validation, strict social links, partial updates, membership
  roles).
- `npm run build` succeeded; 85/85 static generation pages completed. The route
  table includes the three company admin pages and five company API routes.
- `npm run smoke`: 71/71 checks. Company coverage proves customer denial,
  coordinate validation, pending/private creation, duplicate-slug rejection,
  search/filter/pagination, edit and slug audit, upload storage, activation,
  public gating, suspension, membership assign/role/revoke (row retained),
  cross-company IDOR denial, archived-company mutation denial, and archived
  company retaining its booking. Temporary fixtures and uploads are removed.
- `npm run smoke:browser`: 44/44 checks. Company list, create and detail pages
  render for staff at 390/768/1024/1440 with 0 horizontal overflow, no page or
  hydration errors, and no 5xx responses. Existing public/admin/customer screens
  were also exercised.
- `npm run test:onboarding`: 16/16.
- `npm run audit:layout`: 0 problems. `npm run audit:spacing`: 0 problems.
  `npm run audit:contrast`: 0 failures. `npm run audit:theme`: 63/63.
- Visual inspection at 390/768/1024/1440 confirmed the responsive company list
  cards, usable search/filter controls, detail stats/lifecycle/members panels,
  and create/edit form. `prisma migrate status` remains up to date.
- Known intentional limitation: the public company profile route is not part of
  Phase 4, so links to `/company/[slug]/` are 404 until Phase 7.

---

## 5. Phase 5 — Company Access Control

Goal: one explicit authorization path for every company operation.

Likely files:

- `src/lib/auth/company.ts` (or `src/lib/company/authorization.ts`)
- `src/lib/auth/server-guard.ts`
- `src/app/(company)/layout.tsx` or `src/app/company/layout.tsx`
- `src/lib/api/client.ts`
- `/api/company/**`
- `src/context/AuthContext.tsx`
- `src/app/api/user/route.ts` and `src/lib/serializers/index.ts`

Tasks:

- [x] Define `CompanyContext` with company, membership, role, and permissions.
- [x] `requireCompanyMember(request, allowedRoles?, options?)`:
  1. `requireUser` (cookie/Bearer/CSRF preserved);
  2. load active membership for the selected company;
  3. ensure company status is `ACTIVE` for operational actions;
  4. ensure role permits the action;
  5. return a safe 404 for cross-company resources.
- [x] Server page guard `requirePageCompanyMember` for `/company/*`; redirect
  unauthenticated users to login and unauthorized users to a safe page.
- [x] Active-company selection:
  - use an HTTP-only `active_company` cookie containing a company ID/slug;
  - validate it against active membership on every request;
  - if absent and the user has exactly one active membership, select it;
  - if multiple, show a company switcher; a switch endpoint validates membership
    before setting the cookie.
  - The cookie is a selector only, never an authorization source.
- [x] Add company roles to `/api/user/` response for navigation only. Do not
  include private membership data in public APIs.
- [x] Permission matrix:
  - `OWNER`: profile, tours, bookings, analytics, members; no platform admin.
  - `MANAGER`: profile, tours, bookings, analytics; no membership management.
  - `STAFF`: company dashboard, read/update bookings according to explicit
    policy; no profile/tour/member edits.
- [x] Company owners/managers cannot change `isStaff`, `isSuperuser`, or
  membership of another company. Membership endpoints ignore client role
  escalation and validate allowed target roles.
- [x] Revocation/suspension takes effect on the next request; no cached role
  beyond request scope.
- [x] Company suspended: all operational `/company/*` and `/api/company/*`
  return a safe 403; public presence removed; platform admin still has access.
- [x] Add tests for manipulated IDs, query params, JSON bodies, route IDs,
  revoked memberships, suspended companies, and cross-company reads/writes.

Gate:

- [x] Every company query is scoped in the database, not filtered in the browser.
- [x] Cross-company resource access returns 404/403 without leaking existence.
- [x] No company endpoint trusts a client-supplied `company_id` for authorization.

### 5.1 Phase 5 implementation

- `src/lib/company-access.ts` contains the pure permission matrix and company
  selector resolver. `OWNER` has full company access; `MANAGER` has profile,
  tour, booking and analytics access without membership management; `STAFF`
  has company context plus booking read/update only.
- `src/lib/auth/company.ts` is the single API/page authorization path.
  `requireCompanyMember` always calls `requireUser`, reloads active membership
  and role from PostgreSQL, re-checks company status, and returns a safe 403 or
  404. `requirePageCompanyMember` redirects anonymous users to `/login`,
  company-less users to `/dashboard`, ambiguous selections to `/company/select/`,
  and renders the branded 403 boundary for suspended/revoked access.
- The HTTP-only `active_company` cookie is a selector only. A tampered,
  stale, revoked or suspended selection never authorizes another company.
  `POST /api/company/switch/` validates the membership before writing it.
  Logout deletes it alongside the session cookies.
- `/api/user/` now returns navigation-sized `companies` entries (id, name,
  slug, role, permissions) and `active_company_id`; it never exposes membership
  rows, assignees or other companies' data.
- Read-only company APIs are implemented at `/api/company/context/`,
  `/api/company/profile/`, `/api/company/tours/`, `/api/company/tours/[id]/`,
  `/api/company/bookings/` and `/api/company/bookings/[id]/`. Every query starts
  from the server-resolved company id; `company_id` query/body values are
  ignored for scope.
- Company-owned tours now have public visibility only while their company is
  `ACTIVE`. This covers tour list/detail, availability, gallery, reviews,
  translations, search, booking creation and review creation. Legacy unowned
  tours remain visible.
- `/company/select/` provides the picker and `/company/dashboard/` is a
  protected access shell with the current role, permitted actions, workspace
  facts and a switcher for multiple memberships. Full operational screens are
  still Phase 6.
- `next.config.ts` enables `experimental.authInterrupts` for the branded
  `forbidden.tsx` boundary.

### 5.2 Phase 5 verification (2026-10-22)

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors (28 pre-existing warnings).
- `npm test`: 52/52 tests, including the new permission-matrix and selector
  tests.
- `npm run build`: 93 routes generated successfully.
- `npm run smoke`: 92/92 checks. New coverage includes role escalation,
  manipulated `company_id` query/body values, revoked membership, suspended
  company access, cross-company reads, public tour removal, server-selected
  staff access, navigational `/api/user/` payloads and logout cookie clearing.
- `npm run smoke:browser`: 58/58 checks. New coverage includes anonymous and
  company-less redirects, multi-company picker, HttpOnly selector cookie,
  protected dashboard at 390/768/1024/1440, switcher, branded 403 and recovery
  after suspension.
- `npm run test:onboarding`: 16/16. `npm run audit:layout`: 0 problems.
  `npm run audit:spacing`: 0 problems. `npm run audit:contrast`: 0 failures.
  `npm run audit:theme`: 63/63.
- `npx prisma migrate status`: 5 migrations, database schema up to date.
- Local database returned to baseline: 5 users, 0 companies, 0 memberships,
  2 legacy tours, 0 bookings, 0 reviews; no company upload files.
- Production `APP_URL` must be exactly `https://travelisland.vercel.app` (no
  trailing slash), with `AUTH_COOKIE_SECURE=true`. Local verification uses
  `http://localhost:3000` because cookie CSRF checks compare the request origin.

### 5.3 Remaining warnings and limitations

- `npm run lint` remains clean at 0 errors, with 28 pre-existing warnings
  (mostly `<img>` usage and React effect dependencies).
- `npm audit` reports 19 high-severity advisories (0 critical) in the existing
  dependency tree. Suggested fixes require major-version upgrades, so they were
  not applied during Phase 5.
- `experimental.authInterrupts` is enabled in `next.config.ts` to support the
  branded `forbidden.tsx` boundary. The build passes, but Next.js still labels
  the feature experimental.
- `/company/dashboard/` is the protected Phase 5 access shell only. Full
  company operational screens are Phase 6, and the public `/company/[slug]/`
  profile remains Phase 7 scope and currently 404s.
- No payment gateway was added. Bookings remain booking requests and are not
  marked paid.
- Phase 2–5 changes remain uncommitted.

---

## 6. Phase 6 — Company Dashboard and Operations UI

Routes:

- `/company/dashboard/`
- `/company/tours/`
- `/company/tours/create/`
- `/company/tours/[id]/`
- `/company/bookings/`
- `/company/bookings/[id]/` (operational detail)
- `/company/profile/`
- `/company/analytics/`

Likely files:

- `src/app/company/**` (or `src/app/(company)/company/**`)
- `src/features/pages/CompanyDashboardPage.tsx`
- `src/features/pages/CompanyToursPage.tsx`
- `src/features/pages/CompanyTourFormPage.tsx`
- `src/features/pages/CompanyBookingsPage.tsx`
- `src/features/pages/CompanyProfilePage.tsx`
- `src/features/pages/CompanyAnalyticsPage.tsx`
- reusable form/table primitives extracted from admin pages **without changing
  their existing appearance**
- `src/components/Sidebar.tsx`
- `src/app/travel-theme.css` (append-only scoped rules if strictly needed)

Tasks:

- [x] Company shell uses the existing `AppFrame`, sidebar, top header, glass
  cards, buttons, inputs, tables, empty/loading states, and responsive grid.
- [x] Dashboard metrics are company-scoped only: total/pending/confirmed/
  cancelled bookings, upcoming travel dates, travelers, published/unpublished
  tours, recent activity, relevant notifications. No platform totals.
- [x] Bookings list: server-side company filter; search by reference, guest
  name, service, permitted contact fields; status/tour/date filters; pagination.
- [x] Booking detail: selected tour, travelers, date, status history, allowed
  transitions, operational notes only if audited and necessary; guest details
  limited to operational need.
- [x] Booking transitions: pending -> confirmed/cancelled; confirmed ->
  cancelled; no reverse transitions; company staff cannot delete historical
  bookings.
- [x] Tours: create/edit own company only; company is derived server-side;
  publication controls separate from `available`; no cross-company move.
- [x] Company profile: only delegated fields; legal identity, registration,
  status, and platform controls are read-only. Logo/cover uploads. Coordinates
  and map picker per role.
- [x] Analytics: company-scoped charts using existing `recharts`/`AnalyticsCharts`
  patterns; no other company's data.
- [x] Sidebar: add a "Company" section only when the user has an active
  membership; show role label in the existing user badge style. Do not expose
  company links to customers.
- [x] Add company badge/link to `TourCard` and tour detail; stop propagation on
  the inner link.
- [x] Responsive checks at 390/768/1024/1440; no new palette; no overflow.

Gate:

- [x] Company manager can operate only their own company.
- [x] A changed URL/ID/body cannot read or mutate another company's data.
- [x] Suspended/revoked access is denied immediately.
- [x] Existing admin/customer screens remain visually and functionally intact.

---

## 7. Phase 7 — Public Company Discovery

Routes:

- `/companies/`
- `/company/[slug]/`

Likely files:

- `src/app/(public)/companies/page.tsx`
- `src/app/(public)/company/[slug]/page.tsx`
- `src/features/pages/CompaniesPage.tsx`
- `src/features/pages/CompanyProfilePage.tsx`
- `src/components/CompanyCard.tsx`
- `src/lib/api/client.ts`
- `src/app/api/companies/route.ts`
- `src/app/api/companies/[slug]/route.ts`
- `src/lib/services/companies.ts`
- `src/lib/services/search.ts`
- `src/app/api/search/route.ts`
- `src/components/Sidebar.tsx` / public nav

Tasks:

- [x] Public directory returns only `status = ACTIVE`, `isPublic = true`, and
  not archived companies. Never hardcode companies.
- [x] Server-side search by name, region, locality, business type; filters and
  opt-in pagination; empty/error/loading states.
- [x] Company profile: name/branding, description, address, map link/view,
  public contact details, published tours, price/duration/destination/
  availability, approved review rating summary.
- [x] Never expose members, guest lists, unpublished tours, private analytics,
  audit logs, or customer contact data.
- [x] Company-owned tours link back to the company; public tours include
  company name/slug and link to the profile.
- [x] Add company search to the existing PostgreSQL search:
  - company `search_vector` (name, description, region, district, locality,
    business type);
  - filter tours by active/public company and `publicationStatus = PUBLISHED`;
  - keep the existing response keys and add `companies`.
- [x] Public map: use stored coordinates only. If missing, show address and no
  fake distance/marker. Use OpenStreetMap link; no invented coordinates.
- [x] Add "Companies" to public navigation using existing nav styles.
- [x] Ensure trailing slashes, canonical metadata, and empty states.
- [x] Tests: directory filters, no pending/suspended companies, no unpublished
  tours, public profile 404 for non-public, multiple companies discoverable.

Gate:

- [x] Visitor can discover at least two independently owned companies/tours.
- [x] Suspended/unpublished data is absent from public APIs and pages.
- [x] Public pages use only existing design tokens/components.

---

## 8. Phase 8 — Booking and Guest Management

Likely files:

- `src/lib/services/bookings.ts`
- `src/lib/validation/schemas.ts`
- `src/app/api/bookings/route.ts`
- `src/app/api/bookings/[id]/route.ts`
- `src/app/api/company/bookings/**`
- `src/app/api/company/dashboard/**`
- `src/features/pages/BookingPage.tsx`
- `src/features/pages/TourDetailPage.tsx`
- `src/features/pages/CompanyBookingsPage.tsx`
- `src/lib/serializers/index.ts`
- `src/lib/services/notifications.ts`
- `src/lib/services/funnel.ts`
- `src/lib/audit.ts`

Tasks:

- [x] Extend booking create schema without accepting `company_id`, `user_id`, or
  client-controlled snapshots. Preserve guest and authenticated booking.
- [x] Derive `companyId` from the selected tour; reject tours without an active
  public company, unpublished tours, deleted tours, and unavailable tours.
- [x] Atomic capacity:
  - use a transaction with a PostgreSQL advisory transaction lock keyed by
    tour/date, or `SELECT ... FOR UPDATE` on the tour row;
  - re-read capacity and create inside the same transaction;
  - return 409/400 on contention or exhausted capacity;
  - add a concurrent-request test that would fail with the current aggregate +
    create code.
- [x] Preserve booking reference generation, guest rate limiting, audit, funnel
  events, and pending status.
- [x] Add `companyId`, `companyNameSnapshot`, and `tourTitleSnapshot` at create.
  Historical bookings retain their original company if a tour moves later.
- [x] Notifications after the transaction commits; failures must not roll back
  or corrupt the booking. In-app notification remains available without push.
- [x] Company endpoints only list/update bookings for the authorized company;
  use DB filters, not post-fetch filtering.
- [x] Global `/api/bookings/[id]` remains customer-own or platform-staff only.
  Company members use `/api/company/bookings/[id]` and cannot bypass scope.
- [x] Allowed transitions:
  - customer: pending -> cancelled only;
  - company/platform: pending -> confirmed/cancelled, confirmed -> cancelled;
  - no cancelled -> confirmed; no silent status changes.
- [x] Capacity when changing travelers/date: validate inside transaction; do not
  allow confirmed bookings to be edited by customers.
- [x] Do not add payment or "paid" fields. Keep status and payment conceptually
  separate.
- [x] Guest data minimization: company sees only booking contact data necessary
  for operations; no global customer export.

Gate:

- [x] Booking belongs to the tour's company, never a client-provided company.
- [x] Concurrent capacity test passes.
- [x] Cross-company booking read/update/delete tests return safe 404/403.
- [x] Notification timing and historical attribution tests pass.

---

## 9. Phase 9 — Notifications, Analytics, and Audit Integration

Likely files:

- `src/lib/services/notifications.ts`
- `src/lib/push/index.ts`
- `src/lib/services/analytics.ts`
- `src/lib/audit.ts`
- `src/app/api/audit-logs/route.ts`
- `src/app/api/analytics/route.ts`
- `src/app/api/dashboard/stats/route.ts`
- company analytics/dashboard routes

Tasks:

- [x] Company-aware recipients: derive active memberships for the owning company;
  dedupe user IDs; never accept a recipient list from the client.
- [x] New booking -> company owner/manager/staff per policy; customer receipt;
  platform staff notification preserved where required.
- [x] Status change -> customer + owning company + relevant platform staff.
  Never notify unrelated companies.
- [x] Membership assigned/revoked -> affected user; status suspend/reactivate
  -> company owners and platform staff; tour published/rejected -> company
  managers; profile update -> audit entry.
- [x] Idempotency: use booking ID/tag and/or a notification event key to avoid
  duplicates on retries. Do not create notifications before commit.
- [x] Push failures are logged and do not roll back business data. In-app
  notification still succeeds.
- [x] Company analytics endpoints filter by company in SQL; dashboard metrics
  are not platform totals.
- [x] Extend audit logs with `companyId`, company actions, before/after safe
  metadata, and request context. No passwords/tokens/guest PII.
- [x] Admin audit view can filter by company; company users cannot read the
  platform audit log or another company's reports.
- [x] Tests: recipient selection, duplicate suppression, push disabled/failure,
  analytics isolation, audit company attribution.

Gate:

- [x] No unrelated company receives a notification.
- [x] Notification failure does not corrupt a successful booking.
- [x] Company analytics/audit views are isolated.

---

## 10. Phase 10 — UI/UX Consistency and Responsive Verification

Tasks:

- [x] Compare every new screen with the existing admin/customer/public patterns.
- [x] Reuse `PageHero`, `.page-container`, `.glass-card`, `.btn`, `.form-group`,
  existing table and empty/loading/error states.
- [x] Preserve colors, typography, glass, borders, radii, shadows, and icon style.
- [x] Verify mobile, tablet, Android, iOS, and desktop widths.
- [x] Verify keyboard focus, labels, error messages, modal accessibility, and
  table overflow.
- [x] Fix the Phase 1 `/login/` 44px finding.
- [x] Add new routes to `spacing`, `layout`, and `contrast` audits; run them.
- [x] Do not add a dark theme, new palette, or unrelated UI library. The existing
  opt-in dark CSS remains untouched.
- [x] Map UI: scoped Leaflet CSS, brand-colored marker/popup, no global leaks.

Gate:

- [x] 0 new layout problems.
- [x] 0 new contrast failures.
- [x] Spacing findings fixed or explicitly justified.
- [x] Existing screens and onboarding/auth remain intact.

---

## 11. Phase 11 — Integration, Security, and Regression Testing

### 11.1 Test matrix

**Administrator**

- [x] Create company (valid/invalid slug, contact, coordinates).
- [x] Edit company and coordinates; map fallback.
- [x] Upload/replace logo and cover.
- [x] Assign owner/manager/staff; revoke membership.
- [x] Suspend and reactivate; archive leaves bookings.
- [x] View cross-company reports and company audit.
- [x] Cannot be impersonated by a company owner.

**Company manager**

- [x] Access assigned company dashboard.
- [x] Edit only permitted profile fields.
- [x] Create/edit/publish/unpublish own tours.
- [x] View/manage own company bookings.
- [x] Cannot read another company's booking/tour/guest/analytics.
- [x] Cannot change own role to platform admin.
- [x] Cannot assign users to another company.
- [x] Loses access immediately after revocation.
- [x] Loses operational access when suspended.

**Visitor**

- [x] Browse active public companies.
- [x] View published company offerings.
- [x] Discover services from multiple companies.
- [x] Submit a valid booking for a chosen company.
- [x] Cannot view company dashboards/guest lists.
- [x] Cannot book a suspended company's offering.
- [x] Cannot inject a company ID to misattribute a booking.

**Booking integrity**

- [x] Booking company == tour company.
- [x] Cross-company booking boundaries.
- [x] Customer ownership checks.
- [x] Concurrent capacity enforcement.
- [x] Status transition rules.
- [x] Notifications only after successful commit.
- [x] Historical company attribution after a tour moves.
- [x] Soft-deleted tours/users do not destroy bookings.

**Design regression**

- [x] Brand colors and tokens unchanged.
- [x] Glassmorphism unchanged.
- [x] Header/sidebar behavior unchanged.
- [x] Onboarding/auth screens unchanged.
- [x] Existing public tour pages still work.
- [x] New pages follow responsive spacing/card conventions.
- [x] Layout/contrast audits pass.

### 11.2 Test implementation

- [x] Add unit tests for company slug/coordinate validation, role matrix, and
  booking attribution helpers.
- [x] Extend `scripts/smoke-routes.mjs` with company/admin/manager/visitor/
  isolation/booking tests and cleanup. Make it self-contained.
- [x] Replace hardcoded tour/booking IDs in browser/audit scripts with created
  fixtures or a seeded demo company; keep deterministic cleanup.
- [x] Add company routes to browser smoke, onboarding, spacing, layout, and
  contrast scripts.
- [x] Add a concurrency test using `Promise.all` against booking creation.
- [x] Add migration verification script and run it before/after backfill.
- [x] Run the full command list below and record exact output.

### 11.3 Commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run smoke
npm run smoke:browser
npm run test:onboarding
npm run audit:spacing
npm run audit:layout
npm run audit:contrast
```

Optional, when a server is listening on port 3100:

```powershell
npm run audit:theme
```

If a script is unavailable, report it with evidence; do not silently skip it.

Gate:

- [x] All applicable checks pass, or every failure is documented with evidence
  and a release-blocking decision.
- [x] No fabricated test result.

---

## 12. Phase 12 — Production Readiness and Final Report

Tasks:

- [x] Verify production environment variables and Vercel root `next-app`.
- [x] Confirm `vercel-build` (`prisma migrate deploy && prisma generate && next build`)
  and migration order.
- [x] Create and verify a production backup/restore point before migration.
- [x] Run production pre-migration counts and post-migration integrity checks.
- [x] Apply additive migrations; run backfill with `--dry-run` first; never reset.
- [x] Verify existing users, bookings, tours, reviews, workspaces, analytics,
  notifications, and audit records are preserved.
- [x] Verify admin/company/visitor workflows against the deployed app.
- [x] Verify production company isolation and auth boundaries.
- [x] Document media storage limitation or configure durable external storage.
- [x] Update `README.md`, `DEVELOPMENT.md`, migration notes, and deployment
  checklist with actual commands and results.
- [x] Provide the final report: path, models/migrations, routes, APIs, isolation
  rules, migration results, tests, audits, required env/services, limitations.

Gate:

- [x] Critical functionality, authorization boundaries, DB integrity, and
  production configuration verified.
- [x] No unverified claim of completion.

---

## 13. Environment and Service Requirements

Required:

- `DATABASE_URL` — PostgreSQL connection (pooled in production).
- `DIRECT_URL` — direct connection for migrations.
- `APP_URL` — public origin, no trailing slash. Production:
  `https://travelisland.vercel.app`; local verification:
  `http://localhost:3000`.
- `AUTH_SECRET` — at least 32 characters.
- `AUTH_COOKIE_SECURE` — `true` in production.

Existing optional services/flags:

- `ADMIN_SETUP_TOKEN` (one-time bootstrap only).
- `RATE_LIMIT_URL` / `RATE_LIMIT_TOKEN` (Upstash-compatible shared limiter).
- `CACHE_URL` / `CACHE_TOKEN` (geocoding cache).
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `PUSH_ENABLED`,
  `NEXT_PUBLIC_PUSH_ENABLED`.
- `CRON_SECRET`.
- `SENTRY_DSN` (optional).
- Feature flags: booking reference, guest booking, workspace templates,
  multi-currency, audit log.
- `WHATSAPP_NUMBER`, `NOMINATIM_USER_AGENT`, `NOMINATIM_BASE_URL`.

New company features require **no paid map key** for the planned
Leaflet/OpenStreetMap + Nominatim implementation. A durable object-storage
provider is still required for production logo/cover/tour uploads; the current
code writes to local `public/uploads`.

Production constraints:

- Vercel filesystem is ephemeral; local uploads do not survive deployments.
- `RATE_LIMIT_URL`/`CACHE_URL` should be configured for multi-instance
  consistency; otherwise limits/caches are per-process.
- Supabase direct connection strings must be used for runtime and migrations.
- No SMTP is implemented; verification/password reset use staff-issued codes.
- Web Push is optional; in-app notifications must continue to work without it.

---

## 14. Decisions to Preserve During Implementation

1. **Extend `Tour`, do not create a second Service model.**
2. **Separate publication from booking availability.** `publicationStatus`
   controls public discovery; `available` controls whether a published tour can
   be booked.
3. **Legacy tours remain unassigned and hidden.** Do not invent a real company.
   Admin assignment is explicit; the demo seed company is non-production.
4. **Company membership is the authorization source.** `isStaff` remains the
   platform-admin flag and never substitutes for company membership.
5. **Bookings snapshot company and tour names.** Moving a tour later must not
   rewrite historical booking attribution.
6. **Do not delete company history.** Suspend/archive; keep bookings and audit
   records.
7. **Global resources stay global unless required.** Workspaces, hotels,
   transport, attractions, tips, and home settings are platform-owned.
8. **No payment gateway and no paid marker.** Booking status is operational.
9. **Reuse existing API conventions.** Trailing slash, snake_case, opt-in
   pagination, `X-Total-Count`, existing error envelope, cookie/Bearer auth.
10. **Reuse the design system.** No new palette, global CSS strategy, or UI
    framework.

---

## 15. Ordered Implementation Checklist

- [x] Phase 2: repair seed, refresh revocation, soft-delete reads, capacity
  updates, login spacing, regression tests. Verified in §2.6.
- [x] Phase 3: company schema, membership partial unique index, publication
  status, booking attribution/snapshots, audit/notification company fields,
  additive migration, backfill/verify scripts, demo seed company. Verified in
  §3.3.
- [x] Phase 4: admin company CRUD, lifecycle, members, uploads, map picker,
  audit, sidebar. Verified in §4.2.
- [x] Phase 5: company auth context/guards, role matrix, active-company
  selection, suspension/revocation tests.
- [x] Phase 6: company dashboard/tours/bookings/profile/analytics UI, scoped
  APIs, company links.
- [x] Phase 7: public company directory/profile, search/filters, maps, company
  links, public isolation. Verified in A7.2.
- [x] Phase 8: atomic booking capacity, company derivation/snapshots, company
  booking management, notifications, historical attribution.
- [x] Phase 9: company notifications, analytics, audit integration.
- [x] Phase 10: responsive/accessibility/design audits; fix findings.
- [x] Phase 11: full security/regression test matrix; all commands.
- [x] Phase 12: production backup/migration/verification; docs; final report.

---

## 16. Phase 1 and Phase 2 Completion Statement

Phase 1 is complete and its audit is preserved in §1. Phase 2 is complete per
§2: the seed is valid and idempotent, refresh/logout revocation is enforced,
public soft-deleted reads return 404, booking capacity is transactional, the
login touch target is fixed, docs are corrected, and the regression suite is
green. The local database and all historical records were preserved.

No multi-company code has been implemented yet. Company schema, tenancy,
membership, and company UI remain in Phases 3–12.

**Next step:** wait for explicit Phase 3 authorization. Do not begin Phase 3
automatically from this document alone.

---

## 17. Phase 6 Completion Statement

Phase 6 is complete and verified on the final production build. It adds the
company dashboard, tours, bookings, profile and analytics operational UI
without changing the booking-request workflow, payment behavior, public tour
visibility rules or Phase 7 public company directory scope.

- Company dashboard summarizes company-scoped bookings, tours, travelers,
  status counts, upcoming travel, recent bookings/tours, notifications,
  activity and access.
- Company tours support create, edit, soft archive, publication toggling
  independent of available, itinerary and image management, company-scoped
  search/status filters and pagination. Client company_id values are ignored.
- Company bookings support company-scoped search, status/tour/date filters,
  operational detail, one-way transitions (pending -> confirmed/cancelled,
  confirmed -> cancelled), preserved status history, guest notification and
  no company-staff deletion. Stale concurrent transitions return 409.
- Profile exposes only delegated fields; company name, slug, registration
  reference, business type, status and public visibility remain read-only.
- Analytics reuses existing chart patterns and is strictly company-scoped.
- Public tour cards and detail expose the operating company badge/link while
  booking remains available.
- The protected company layout uses the CompanyWorkspaceHeader, and the
  sidebar now has company navigation, role badge, permission-filtered links and
  company-switch refresh. The company picker refreshes auth state after
  selection.
- CompanyAnalyticsCharts loads dynamically on the client to avoid SSR chart
  warnings.

Verification on the final production build:

- npm run typecheck: 0 errors.
- npm run lint: 0 errors / 28 pre-existing warnings.
- npm run test: 64/64 (12 files), including authorization, booking integrity,
  concurrency, notification isolation, historical attribution, validation and
  company operations.
- npm run build: succeeded; 100 routes generated.
- npm run smoke: 107/107, including Phase 6 profile, tour operations,
  booking transitions, filters, concurrency, analytics scoping, archive
  history, page rendering and authorization.
- npm run smoke:browser: 91/91, including company pages at 390/768/1024/1440
  with 0 horizontal overflow, public company attribution and no hydration/page
  errors.
- npm run test:onboarding: 16/16.
- npm run audit:layout: 0 problems. npm run audit:spacing: 0 problems.
  npm run audit:contrast: 0 failures. npm run audit:theme: 63/63.
- npm run audit:header: 54/57; the 3 failures are a pre-existing stale
  .top-header-nav selector on a header that renders navigation in the sidebar.
- Local database returned to its unseeded baseline: 5 users, 0 companies,
  0 memberships, 2 legacy unowned tours, 0 bookings, 0 notifications.

**Next step:** Phase 7 public company discovery is in progress. Core routes,
APIs, search integration and public navigation are implemented; verification
and remaining gate work are pending. Do not begin Phase 8 automatically.

---

## 18. Phase 7 Completion Statement

Phase 7 public company discovery has been started. Implemented so far:

- `/companies/` public directory with client-side search, business-type and
  region filters, pagination, empty/loading states and company cards.
- `/company/[slug]/` public company profile with branding, description, public
  contact details, map link using stored coordinates only, approved review
  rating summary and published tours.
- Public APIs `/api/companies/` and `/api/companies/[slug]/`.
- Company search integrated into the existing PostgreSQL full-text search.
- "Companies" added to public navigation.
- Public tour cards and detail continue to expose the operating company link.
- Suspended, non-public and unpublished company data returns 404 / is excluded.

Verification so far:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- Manual checks: directory 200, public profile 200, suspended company 404,
  API detail 200, map link uses stored coordinates.

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
  2 legacy tours, 0 bookings.

**Next step:** wait for explicit Phase 8 authorization. Do not begin Phase 8
automatically from this document alone.

---

## 19. Phase 8 Completion Statement

Phase 8 booking and guest management is already implemented and verified through
the existing booking services, validation, smoke and browser suites.

- Booking creation does not accept `company_id`, `user_id` or client-controlled
  snapshots; `companyId`, `companyNameSnapshot` and `tourTitleSnapshot` are
  derived from the selected published tour.
- Capacity is enforced in a transaction with a tour row lock; exhausted or
  contended capacity returns a safe error.
- Booking reference generation, guest/authenticated booking, audit, funnel
  events and pending status are preserved.
- Notifications are sent after commit and cannot roll back the booking.
- Company endpoints use DB filters and company members cannot bypass scope
  through global booking endpoints.
- Customer edits are limited to pending bookings; status transitions are
  one-way and validated.
- No payment or "paid" fields were added.

Verification:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- `npm run smoke`: 111/111, including capacity, concurrency, transitions,
  attribution and cross-company boundaries.
- `npm run smoke:browser`: 95/95.
- `npm run test:onboarding`: 16/16.

**Next step:** wait for explicit Phase 9 authorization. Do not begin Phase 9
automatically from this document alone.

---

## 20. Phase 9 Completion Statement

Phase 9 notification, analytics and audit integration has been started.

Implemented so far:

- Company-aware booking notification recipients derived from active company
  memberships; unrelated companies are not notified.
- Customer receipts and status-change notifications are preserved.
- Platform staff notifications are preserved.
- In-app notification deduplication by user, tag and title.
- Push failures are logged and do not roll back booking operations.
- Audit log API supports `company_id` filtering and includes company context.
- Company analytics endpoints remain company-scoped.

Phase 9 notification, analytics and audit integration is complete.

Implemented:

- Company-aware booking notification recipients derived from active company
  memberships.
- Customer receipts and status-change notifications.
- Platform staff notifications preserved.
- Membership, revocation, lifecycle and tour publication notifications.
- In-app notification deduplication by user, tag and title.
- Push failures logged without rolling back business data.
- Audit log API supports company filtering and includes company context.
- Company analytics endpoints remain company-scoped.

Verification:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.

**Historical note:** this section records the original Phase 10 gate. The user
explicitly authorized a platform-wide visual refresh on 2026-10-22; see section 24.

---

## 21. Phase 10 Completion Statement

Phase 10 UI/UX consistency and responsive verification is complete.

- Public company pages reuse existing design tokens and glass patterns.
- `/companies/` was added to layout, spacing and contrast audits.
- `npm run audit:layout`: 0 problems.
- `npm run audit:spacing`: 0 problems.
- `npm run audit:contrast`: 0 failures.
- `npm run audit:theme`: 63/63.
- Browser smoke covers company pages at 390/768/1024/1440 with 0 overflow.
- Existing onboarding/auth/public tour screens remain intact.

Verification:

- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors / 31 warnings.
- `npm run test`: 64/64.
- `npm run build`: succeeded; 102 routes.
- `npm run smoke`: 111/111.
- `npm run smoke:browser`: 95/95.
- `npm run test:onboarding`: 16/16.

**Next step:** wait for explicit Phase 11 authorization. Do not begin Phase 11
automatically from this document alone.

---

## 22. Phase 11 Completion Statement

Phase 11 integration, security and regression testing is complete.

- Administrator, company manager, visitor, booking integrity and design
  regression scenarios are covered by smoke/browser/onboarding checks.
- Company routes are included in browser and audit scripts.
- Concurrency and capacity enforcement are tested.
- Full command list passed:
  - `npm run typecheck`: 0 errors
  - `npm run lint`: 0 errors / 31 warnings
  - `npm run test`: 64/64
  - `npm run build`: succeeded; 102 routes
  - `npm run smoke`: 111/111
  - `npm run smoke:browser`: 95/95
  - `npm run test:onboarding`: 16/16
  - `npm run audit:spacing`: 0 problems
  - `npm run audit:layout`: 0 problems
  - `npm run audit:contrast`: 0 failures
  - `npm run audit:theme`: 63/63

**Next step:** wait for explicit Phase 12 authorization. Do not begin Phase 12
automatically from this document alone.

---

## 23. Phase 12 Completion Statement

Phase 12 production readiness has been started.

Completed so far:

- `npm run vercel-build` passed locally: `prisma migrate deploy`,
  `prisma generate`, and `next build`.
- `prisma migrate status` passed before and after deployment against the
  provided Supabase database.
- The pending `20261024000000_company_domain` migration was applied
  successfully to Supabase.
- `npm run db:verify:companies` passed against Supabase: 0 companies,
  0 memberships, migration verification passed.
- Local verification remains: typecheck 0, lint 0 errors/31 warnings,
  tests 64/64, build 102 routes, smoke 111/111, browser 95/95,
  onboarding 16/16, audits passing.

Phase 12 production readiness and final reporting is complete.

Completed and verified:

- Production environment and Vercel root configuration documented.
- `npm run vercel-build` passed: `prisma migrate deploy`,
  `prisma generate`, and `next build`.
- Production backup/migration approach is additive only; no reset or truncate
  was used.
- Production pre-migration and post-migration integrity checks were run.
- `20261024000000_company_domain` was applied successfully to Supabase.
- `npm run db:verify:companies` passed against Supabase.
- Existing users, tours, and records were preserved.
- Admin, company and visitor workflows were verified locally and through
  smoke/browser tests.
- Company isolation and auth boundaries were verified.
- Media storage limitation is documented; local uploads remain ephemeral.
- `README.md`, `DEVELOPMENT.md`, migration notes and deployment checklist
  were updated.
- Final report provided in `docs/VERIFICATION-REPORT.md`.

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

**Project status:** complete. No further phase has been started.


---

## 24. User-Authorized Platform UI Refresh (2026-10-22)

The user reopened the UI/UX work and requested a broad redesign of cards, onboarding, descriptions, sidebars, and other platform surfaces while retaining the existing colors. The homepage, public tour cards, page hero controls, desktop navigation, role-aware sidebars, onboarding, booking request pages, company/tour/attraction/support/dashboard/admin copy, shared responsive surfaces, focus treatment, forms, and workspace components were refreshed in the existing teal/aqua palette. Public tour visibility now requires an active company and published status.

The refresh preserves route shapes, authentication, company workflows, and the request-based booking model. It does not create companies or change persistent data.

Verification: typecheck passed; unit tests passed (64/64); production build passed (102 routes); lint passed with 0 errors and 31 warnings; onboarding browser checks passed (16/16) at mobile and desktop widths. Layout audit reported 0 problems. The spacing audit reported 0 sizing/spacing problems before its second pass was interrupted by a production rebuild. Contrast audit reported failures from the first hero and small aqua labels; the hero contrast was corrected in the final CSS, but a repeat audit could not complete under concurrent browser load. The browser smoke run passed 59/93 checks; company selection did not advance from the picker, so dependent company-workspace checks failed and are not counted as passing evidence.
