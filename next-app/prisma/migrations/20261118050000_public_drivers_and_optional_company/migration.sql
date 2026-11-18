-- AlterEnum
ALTER TYPE "UserAccountType" ADD VALUE IF NOT EXISTS 'DRIVER';

-- AlterTable
ALTER TABLE "private_hire_vehicles" ALTER COLUMN "company_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "private_hire_services" ALTER COLUMN "company_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "private_hire_drivers" ALTER COLUMN "company_id" DROP NOT NULL;
ALTER TABLE "private_hire_drivers" ADD COLUMN "user_id" INTEGER;
ALTER TABLE "private_hire_drivers" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "private_hire_drivers" ADD CONSTRAINT "private_hire_drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "private_hire_drivers_user_id_idx" ON "private_hire_drivers"("user_id");
