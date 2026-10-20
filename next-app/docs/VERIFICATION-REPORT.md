# Verification report

Date: 2026-10-20

## Commands and results

| Command | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, warnings only (`<img>`, custom font) |
| `npm test` | 26/26 tests passed |
| `npm run build` | 62 routes generated successfully |
| `npm run db:verify` | 38/38 checks passed |
| `npm run smoke` | 38/38 checks passed |
| `npm run smoke:browser` | 33/33 checks passed |

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
- Ported page components use `// @ts-nocheck`; API, service and library code is
  fully type-checked.
- Production PostgreSQL, SMTP and Supabase credentials were not available in this
  environment; those paths were validated through configuration and code paths
  rather than live services.
