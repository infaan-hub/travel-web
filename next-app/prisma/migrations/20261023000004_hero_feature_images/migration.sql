ALTER TABLE "home_settings"
  ADD COLUMN "hero_feature_image" TEXT,
  ADD COLUMN "hero_feature_image_data" BYTEA,
  ADD COLUMN "hero_feature_image_mime" TEXT,
  ADD COLUMN "hero_thumb_image" TEXT,
  ADD COLUMN "hero_thumb_image_data" BYTEA,
  ADD COLUMN "hero_thumb_image_mime" TEXT;
