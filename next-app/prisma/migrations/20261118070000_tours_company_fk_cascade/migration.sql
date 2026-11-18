-- Allow deleting a company even when it still has tours assigned.
-- Previously the FK used NO ACTION (RESTRICT), which blocked
-- `DELETE FROM companies` while tours still referenced the company.

ALTER TABLE "tours" DROP CONSTRAINT "tours_company_id_fkey";

ALTER TABLE "tours" ADD CONSTRAINT "tours_company_id_fkey" FOREIGN KEY ("company_id")
  REFERENCES "companies" ("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
