# Rollback

## Application rollback

1. Keep the previous deployment artifact available.
2. Re-point the platform to the previous build.
3. Restart the application.

## Data rollback

1. Restore the PostgreSQL database from the pre-migration backup.
2. Restore `public/uploads` or the storage bucket prefix from backup.
3. Re-run `npm run db:verify` against the restored database.

## Safety notes

- Keep the previous deployment artifact available as the rollback reference.
- The SQLite source database is never modified by `db:export`.
- Object storage keys are relative, so a restored bucket prefix works without
  changing database rows.
