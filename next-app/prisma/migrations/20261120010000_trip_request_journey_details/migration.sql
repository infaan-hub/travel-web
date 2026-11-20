-- Carry the full journey on the trip itself, not only on the booking.
ALTER TABLE "transport_trip_requests"
  ADD COLUMN IF NOT EXISTS "pickup_time" TEXT,
  ADD COLUMN IF NOT EXISTS "distance_km" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "duration_mins" INTEGER;
