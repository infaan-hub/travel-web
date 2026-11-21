-- Add default vehicle fare columns (One-way, Wait & return, Full day private charter)
ALTER TABLE "private_hire_vehicles"
  ADD COLUMN IF NOT EXISTS "one_way_price_usd" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "wait_return_price_usd" DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "full_day_price_usd" DECIMAL(10, 2);

-- Add trip pricing option to transport_bookings
ALTER TABLE "transport_bookings"
  ADD COLUMN IF NOT EXISTS "trip_option" TEXT NOT NULL DEFAULT 'one_way';

-- Create route_prices table for public hire drivers and private hire companies
CREATE TABLE IF NOT EXISTS "route_prices" (
  "id" SERIAL NOT NULL,
  "driver_id" INTEGER,
  "company_id" INTEGER,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "one_way_price_usd" DECIMAL(10, 2) NOT NULL,
  "wait_return_price_usd" DECIMAL(10, 2) NOT NULL,
  "full_day_price_usd" DECIMAL(10, 2) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "route_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "route_prices_driver_id_is_active_idx" ON "route_prices"("driver_id", "is_active");
CREATE INDEX IF NOT EXISTS "route_prices_company_id_is_active_idx" ON "route_prices"("company_id", "is_active");
CREATE INDEX IF NOT EXISTS "route_prices_origin_destination_idx" ON "route_prices"("origin", "destination");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'route_prices_driver_id_fkey'
  ) THEN
    ALTER TABLE "route_prices"
      ADD CONSTRAINT "route_prices_driver_id_fkey"
      FOREIGN KEY ("driver_id") REFERENCES "private_hire_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'route_prices_company_id_fkey'
  ) THEN
    ALTER TABLE "route_prices"
      ADD CONSTRAINT "route_prices_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
