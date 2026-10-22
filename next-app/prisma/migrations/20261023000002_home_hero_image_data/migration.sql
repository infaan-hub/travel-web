ALTER TABLE "home_settings"
  ADD COLUMN "hero_image_data" BYTEA,
  ADD COLUMN "hero_image_mime" TEXT,
  ADD COLUMN "hero_secondary_image_data" BYTEA,
  ADD COLUMN "hero_secondary_image_mime" TEXT;
