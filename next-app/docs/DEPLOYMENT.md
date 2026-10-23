# Deployment

## Prerequisites

- Node.js 22+
- PostgreSQL 15+ (managed provider recommended)
- VAPID keys for Web Push notifications (optional)
- A durable object-storage integration for production media (not yet
  implemented for general uploads; homepage hero and More Experiences images
  are stored in PostgreSQL)

## Steps

1. Set environment variables from `.env.example`.
2. Run `npm ci`.
3. On Vercel, use the default install command and set the build command to
   `npm run vercel-build` (or run `npm run db:migrate` before `npm run build`).
4. Run `npm run db:migrate` against the target database.
5. Run `npm run db:backfill:companies -- --dry-run`, review the report, then
   run it again with `--apply` to fill historical booking snapshots. Do not use
   `--assign-tours` unless the legacy tour's real owner has been confirmed.
6. Verify with `npm run db:verify:companies` (use `--baseline` if a pre-migration
   count snapshot was captured).
7. Before enabling general uploads in production, integrate durable external
   media storage. Uploading `public/uploads` manually is not a supported
   production storage strategy because the Vercel filesystem is ephemeral. The
   homepage hero photos and five More Experiences portfolio slots are stored
   in PostgreSQL.
8. Start with `npm run start` or the platform's Next.js adapter.

Demo seeding is not part of the application. Create administrator accounts
explicitly with the documented admin setup workflow.

## Production checklist

- `APP_URL=https://travelisland.vercel.app` (exactly, without a trailing slash).
- `AUTH_SECRET` is at least 32 random characters.
- `AUTH_COOKIE_SECURE=true`.
- `ADMIN_SETUP_TOKEN` is either unset or removed after the first administrator is
  created.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  are set so booking notifications can be delivered.
- `RATE_LIMIT_URL` / `RATE_LIMIT_TOKEN` and `CACHE_URL` / `CACHE_TOKEN` point at
  a shared Redis store so rate limits and caches are consistent across instances.
- `CRON_SECRET` protects `/api/cron/cleanup`, which runs daily via `vercel.json`.
- Rate limiting is understood to be process-local; use a shared store if running
  multiple instances.
- `GET /api/health` is implemented and reports application/database status.
