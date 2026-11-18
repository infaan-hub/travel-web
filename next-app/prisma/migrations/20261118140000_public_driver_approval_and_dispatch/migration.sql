ALTER TABLE "partner_join_requests" ADD COLUMN "driver_id" INTEGER;
ALTER TABLE "transport_bookings" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "transport_trip_requests" ADD COLUMN "driver_id" INTEGER;

CREATE UNIQUE INDEX "partner_join_requests_driver_id_key" ON "partner_join_requests"("driver_id");
CREATE INDEX "transport_bookings_is_public_status_travel_date_idx" ON "transport_bookings"("is_public", "status", "travel_date");
CREATE INDEX "transport_trip_requests_driver_id_status_travel_date_idx" ON "transport_trip_requests"("driver_id", "status", "travel_date");

ALTER TABLE "partner_join_requests" ADD CONSTRAINT "partner_join_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "private_hire_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transport_trip_requests" ADD CONSTRAINT "transport_trip_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "private_hire_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
