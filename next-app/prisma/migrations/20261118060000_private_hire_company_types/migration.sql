-- Rename old enum
ALTER TYPE "CompanyBusinessType" RENAME TO "CompanyBusinessType_old";

-- Create new enum
CREATE TYPE "CompanyBusinessType" AS ENUM ('TRANSPORT_OPERATOR', 'CAR_RENTAL', 'SHUTTLE_OPERATOR', 'OTHER');

-- Migrate column (no rows expected; cast via text)
ALTER TABLE "companies"
  ALTER COLUMN "business_type" DROP DEFAULT,
  ALTER COLUMN "business_type" TYPE "CompanyBusinessType"
  USING "business_type"::text::"CompanyBusinessType";

-- Restore default
ALTER TABLE "companies" ALTER COLUMN "business_type" SET DEFAULT 'TRANSPORT_OPERATOR';

-- Drop old enum
DROP TYPE "CompanyBusinessType_old";
