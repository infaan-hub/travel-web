-- Add per-date tour departures for capacity management.
CREATE TABLE "tour_departures" (
    "id" SERIAL NOT NULL,
    "tour_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booked_count" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tour_departures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tour_departures_tour_id_date_key" ON "tour_departures"("tour_id", "date");
CREATE INDEX "tour_departures_tour_id_date_idx" ON "tour_departures"("tour_id", "date");
CREATE INDEX "tour_departures_status_idx" ON "tour_departures"("status");

ALTER TABLE "tour_departures"
  ADD CONSTRAINT "tour_departures_tour_id_fkey"
  FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD COLUMN "departure_id" INTEGER;
CREATE INDEX "bookings_departure_id_idx" ON "bookings"("departure_id");
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_departure_id_fkey"
  FOREIGN KEY ("departure_id") REFERENCES "tour_departures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
