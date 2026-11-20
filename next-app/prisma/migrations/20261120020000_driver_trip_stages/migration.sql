-- Add live driver execution stage tracking columns to transport_bookings.
ALTER TABLE "transport_bookings"
  ADD COLUMN IF NOT EXISTS "driver_stage" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "arrived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "picked_up_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reached_dest_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "driver_lat" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "driver_lng" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "driver_location_updated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "driver_notes" TEXT NOT NULL DEFAULT '';
