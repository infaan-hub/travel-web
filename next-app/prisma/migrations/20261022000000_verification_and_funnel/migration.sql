-- Password reset + email verification tokens, tour translations, funnel events
-- and workspace templates.

ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "reset_requested_at" TIMESTAMP(3);

ALTER TABLE "workspaces" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "verification_tokens" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "purpose" VARCHAR(32) NOT NULL,
  "code_hash" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tour_translations" (
  "id" SERIAL NOT NULL,
  "tour_id" INTEGER NOT NULL,
  "locale" VARCHAR(8) NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "short_description" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "tour_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "funnel_events" (
  "id" SERIAL NOT NULL,
  "session_id" VARCHAR(100) NOT NULL,
  "stage" VARCHAR(32) NOT NULL,
  "tour_id" INTEGER,
  "booking_id" INTEGER,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "funnel_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "verification_tokens_user_id_purpose_idx" ON "verification_tokens"("user_id", "purpose");
CREATE INDEX "verification_tokens_expires_at_idx" ON "verification_tokens"("expires_at");
CREATE UNIQUE INDEX "tour_translations_tour_id_locale_key" ON "tour_translations"("tour_id", "locale");
CREATE INDEX "funnel_events_stage_created_at_idx" ON "funnel_events"("stage", "created_at");
CREATE INDEX "funnel_events_session_id_idx" ON "funnel_events"("session_id");

ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_tour_id_fkey"
  FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
