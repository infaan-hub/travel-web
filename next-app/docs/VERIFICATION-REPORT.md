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
