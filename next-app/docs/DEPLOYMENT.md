# Deployment

## Prerequisites

- Node.js 22+
- PostgreSQL 15+ (managed provider recommended)
- SMTP credentials for booking emails (optional)
- Supabase Storage credentials for production media

## Steps

1. Set environment variables from `.env.example`.
2. Run `npm ci`.
3. On Vercel, use the default install command and set the build command to
   `npm run vercel-build` (or run `npm run db:migrate` before `npm run build`).
4. Run `npm run db:migrate` against the target database.
5. Upload `public/uploads` to the configured storage bucket when using Supabase.
7. Start with `npm run start` or the platform's Next.js adapter.

## Production checklist

- `AUTH_SECRET` is at least 32 random characters.
- `AUTH_COOKIE_SECURE=true`.
- `ADMIN_SETUP_TOKEN` is either unset or removed after the first administrator is
  created.
- `STORAGE_PROVIDER=supabase` with valid service credentials.
- Rate limiting is understood to be process-local; use a shared store if running
  multiple instances.
- `/api/health` is not implemented; use a lightweight authenticated or public
  route for platform health checks.
