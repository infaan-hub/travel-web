-- Support common company admin/public listing and workspace dashboard queries.
-- Concurrent index builds keep writes available during production deploys.
CREATE INDEX IF NOT EXISTS "companies_status_created_at_idx"
  ON "companies" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "companies_is_public_status_name_idx"
  ON "companies" ("is_public", "status", "name");
CREATE INDEX IF NOT EXISTS "tours_company_id_deleted_at_updated_at_idx"
  ON "tours" ("company_id", "deleted_at", "updated_at");
CREATE INDEX IF NOT EXISTS "bookings_company_id_travel_date_status_idx"
  ON "bookings" ("company_id", "travel_date", "status");
CREATE INDEX IF NOT EXISTS "notifications_user_id_tag_title_idx"
  ON "notifications" ("user_id", "tag", "title");
