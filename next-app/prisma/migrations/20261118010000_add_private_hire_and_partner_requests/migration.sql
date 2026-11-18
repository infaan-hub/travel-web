-- CreateEnum
CREATE TYPE "DriverIdType" AS ENUM ('ZAN_ID', 'NIDA', 'PASSPORT');

-- CreateEnum
CREATE TYPE "JoinRequestType" AS ENUM ('COMPANY_REGISTRATION', 'PUBLIC_DRIVER_REGISTRATION');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "CompanyRole" ADD VALUE 'DRIVER';

-- CreateTable
CREATE TABLE "private_hire_vehicles" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Sedan',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "luggage_capacity" INTEGER NOT NULL DEFAULT 2,
    "description" TEXT NOT NULL DEFAULT '',
    "includes" JSONB NOT NULL DEFAULT '[]',
    "excludes" JSONB NOT NULL DEFAULT '[]',
    "front_image" TEXT NOT NULL,
    "side_image" TEXT,
    "back_image" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_hire_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_hire_drivers" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "license_number" TEXT NOT NULL,
    "id_type" "DriverIdType" NOT NULL DEFAULT 'ZAN_ID',
    "id_number" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_hire_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_hire_services" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(10,2) NOT NULL,
    "pricing_type" TEXT NOT NULL DEFAULT 'per_trip',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_hire_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_join_requests" (
    "id" SERIAL NOT NULL,
    "type" "JoinRequestType" NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company_name" TEXT,
    "id_type" "DriverIdType",
    "id_number" TEXT,
    "license_number" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "admin_notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "private_hire_vehicles_company_id_is_available_idx" ON "private_hire_vehicles"("company_id", "is_available");

-- CreateIndex
CREATE INDEX "private_hire_drivers_company_id_is_active_idx" ON "private_hire_drivers"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "private_hire_services_company_id_is_active_idx" ON "private_hire_services"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "private_hire_services_vehicle_id_idx" ON "private_hire_services"("vehicle_id");

-- CreateIndex
CREATE INDEX "private_hire_services_driver_id_idx" ON "private_hire_services"("driver_id");

-- CreateIndex
CREATE INDEX "partner_join_requests_type_status_idx" ON "partner_join_requests"("type", "status");

-- CreateIndex
CREATE INDEX "partner_join_requests_created_at_idx" ON "partner_join_requests"("created_at");

-- AddForeignKey
ALTER TABLE "private_hire_vehicles" ADD CONSTRAINT "private_hire_vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_hire_drivers" ADD CONSTRAINT "private_hire_drivers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_hire_services" ADD CONSTRAINT "private_hire_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_hire_services" ADD CONSTRAINT "private_hire_services_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "private_hire_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_hire_services" ADD CONSTRAINT "private_hire_services_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "private_hire_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
