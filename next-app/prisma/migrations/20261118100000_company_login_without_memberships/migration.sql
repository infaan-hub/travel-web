-- Replace company memberships with one direct company login per user.
-- Active OWNER accounts are preferred; otherwise the earliest active account
-- becomes the company login. If one user was selected for multiple companies,
-- that user keeps the best-ranked company only. Other companies remain
-- unassigned for an admin to give them a dedicated login.
ALTER TABLE "users" ADD COLUMN "company_id" INTEGER;

WITH company_ranked AS (
  SELECT "company_id", "user_id", "role", "created_at", "id",
    ROW_NUMBER() OVER (
      PARTITION BY "company_id"
      ORDER BY ("role" = 'OWNER') DESC, "created_at" ASC, "id" ASC
    ) AS company_rank
  FROM "company_memberships"
  WHERE "status" = 'ACTIVE'
),
company_accounts AS (
  SELECT "company_id", "user_id", "role", "created_at"
  FROM company_ranked
  WHERE company_rank = 1
),
user_ranked AS (
  SELECT "company_id", "user_id",
    ROW_NUMBER() OVER (
      PARTITION BY "user_id"
      ORDER BY ("role" = 'OWNER') DESC, "created_at" ASC, "company_id" ASC
    ) AS user_rank
  FROM company_accounts
),
company_logins AS (
  SELECT "company_id", "user_id"
  FROM user_ranked
  WHERE user_rank = 1
)
UPDATE "users" AS account
SET "company_id" = company_logins."company_id",
    "account_type" = 'PRIVATE_HIRE_COMPANY'
FROM company_logins
WHERE account."id" = company_logins."user_id";

UPDATE "users"
SET "account_type" = 'CUSTOMER'
WHERE "account_type" = 'PRIVATE_HIRE_COMPANY'
  AND "company_id" IS NULL;

CREATE UNIQUE INDEX "users_company_id_key" ON "users"("company_id");
ALTER TABLE "users"
  ADD CONSTRAINT "users_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "company_memberships";
ALTER TABLE "companies" DROP COLUMN "business_type";
DROP TYPE "CompanyMembershipStatus";
DROP TYPE "CompanyRole";
DROP TYPE "CompanyBusinessType";
