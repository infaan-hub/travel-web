-- Trip-first: every transport booking carries an origin -> destination journey.
ALTER TABLE "transport_bookings"
  ADD COLUMN IF NOT EXISTS "origin" TEXT,
  ADD COLUMN IF NOT EXISTS "origin_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "origin_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "destination" TEXT,
  ADD COLUMN IF NOT EXISTS "dest_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dest_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "distance_km" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "duration_mins" INTEGER,
  ADD COLUMN IF NOT EXISTS "trip_request_id" INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_bookings_trip_request_id_fkey'
  ) THEN
    ALTER TABLE "transport_bookings"
      ADD CONSTRAINT "transport_bookings_trip_request_id_fkey"
      FOREIGN KEY ("trip_request_id") REFERENCES "transport_trip_requests"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "transport_bookings_trip_request_id_idx"
  ON "transport_bookings" ("trip_request_id");
