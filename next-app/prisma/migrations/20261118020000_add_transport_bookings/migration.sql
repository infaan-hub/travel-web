-- CreateEnum
CREATE TYPE "TransportBookingType" AS ENUM ('transport', 'rental');

-- CreateEnum
CREATE TYPE "TransportBookingStatus" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "transport_bookings" (
    "id" SERIAL NOT NULL,
    "reference" TEXT,
    "booking_type" "TransportBookingType" NOT NULL DEFAULT 'transport',
    "user_id" INTEGER,
    "service_id" INTEGER,
    "company_id" INTEGER,
    "vehicle_id" INTEGER,
    "driver_id" INTEGER,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "travel_date" DATE NOT NULL,
    "end_date" DATE,
    "pickup_time" TEXT,
    "total_price" DECIMAL(12,2),
    "status" "TransportBookingStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_bookings_reference_key" ON "transport_bookings"("reference");

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "private_hire_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "private_hire_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_bookings" ADD CONSTRAINT "transport_bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "private_hire_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "transport_bookings_user_id_created_at_idx" ON "transport_bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "transport_bookings_company_id_status_travel_date_idx" ON "transport_bookings"("company_id", "status", "travel_date");

-- CreateIndex
CREATE INDEX "transport_bookings_service_id_idx" ON "transport_bookings"("service_id");
