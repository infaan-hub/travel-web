# Deployment

## Prerequisites

- Node.js 22+
- PostgreSQL 15+ (managed provider recommended)
- VAPID keys for Web Push notifications (optional)
- Company logo and cover uploads are stored in PostgreSQL. Other uploads use
  Vercel Blob when configured; Vercel's connected-store OIDC credentials are
  preferred, and `BLOB_READ_WRITE_TOKEN` is supported for development or
  non-Vercel hosts.

## Steps

1. Set environment variables from `.env.example`.
2. Run `npm ci`.
3. On Vercel, use the default install command and set the build command to
   `npm run vercel-build` (or `npm run build`). The build generates the Prisma
   client and builds the app without applying migrations or requiring a
   successful database connection. If the database is unavailable, the build
   omits database-backed sitemap entries.
4. Run `npm run db:migrate` as a separate release step against the target
   database, from an environment that can reach it, before deploying code that
   depends on the new schema.
5. Run `npm run db:backfill:companies -- --dry-run`, review the report, then
   run it again with `--apply` to fill historical booking snapshots. Do not use
   `--assign-tours` unless the legacy tour's real owner has been confirmed.
6. Verify with `npm run db:verify:companies` (use `--baseline` if a pre-migration
   count snapshot was captured).
7. For uploads other than company logos and covers, create a **public Blob
   store** in Vercel Storage and connect it to the project for Production and
   Preview. The SDK uses the connected store's OIDC credentials automatically.
   Do not rely on `public/uploads` on Vercel; its filesystem is ephemeral.
   Homepage hero photos, More Experiences images, and company images are stored
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
