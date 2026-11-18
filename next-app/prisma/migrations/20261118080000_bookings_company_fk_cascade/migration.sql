-- Change bookings.company FK from RESTRICT to CASCADE
-- This allows deleting a company even when it has bookings

ALTER TABLE "bookings" DROP CONSTRAINT "bookings_company_id_fkey";

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_fkey" FOREIGN KEY ("company_id")
  REFERENCES "companies" ("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;