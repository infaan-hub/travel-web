-- Add background image slots for the two Home Trips request cards
ALTER TABLE "home_settings"
  ADD COLUMN IF NOT EXISTS "trip_public_card_image" TEXT,
  ADD COLUMN IF NOT EXISTS "trip_public_card_image_data" BYTEA,
  ADD COLUMN IF NOT EXISTS "trip_public_card_image_mime" TEXT,
  ADD COLUMN IF NOT EXISTS "trip_company_card_image" TEXT,
  ADD COLUMN IF NOT EXISTS "trip_company_card_image_data" BYTEA,
  ADD COLUMN IF NOT EXISTS "trip_company_card_image_mime" TEXT;
