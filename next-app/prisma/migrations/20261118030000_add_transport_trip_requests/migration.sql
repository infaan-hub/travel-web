-- CreateEnum
CREATE TYPE "TransportTripRequestStatus" AS ENUM ('requested', 'quoted', 'accepted', 'cancelled');

-- CreateTable
CREATE TABLE "transport_trip_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "origin" TEXT NOT NULL,
    "origin_lat" DOUBLE PRECISION,
    "origin_lng" DOUBLE PRECISION,
    "destination" TEXT NOT NULL,
    "dest_lat" DOUBLE PRECISION,
    "dest_lng" DOUBLE PRECISION,
    "travel_date" DATE NOT NULL,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "luggage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "TransportTripRequestStatus" NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_trip_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transport_trip_requests" ADD CONSTRAINT "transport_trip_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "transport_trip_requests_user_id_created_at_idx" ON "transport_trip_requests"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "transport_trip_requests_status_created_at_idx" ON "transport_trip_requests"("status", "created_at");
