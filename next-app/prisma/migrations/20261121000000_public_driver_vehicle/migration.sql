-- Link a single self-registered vehicle directly to a public hire driver (1 vehicle per 1 driver).
ALTER TABLE "private_hire_vehicles"
  ADD COLUMN IF NOT EXISTS "driver_id" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "private_hire_vehicles_driver_id_key"
  ON "private_hire_vehicles"("driver_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'private_hire_vehicles_driver_id_fkey'
  ) THEN
    ALTER TABLE "private_hire_vehicles"
      ADD CONSTRAINT "private_hire_vehicles_driver_id_fkey"
      FOREIGN KEY ("driver_id")
      REFERENCES "private_hire_drivers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
