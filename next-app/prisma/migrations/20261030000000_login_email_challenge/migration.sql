-- Add login email verification challenge hardening fields.
ALTER TABLE "verification_tokens"
  ADD COLUMN "challenge_token" VARCHAR(128),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "max_attempts" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "resend_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_resent_at" TIMESTAMP(3),
  ADD COLUMN "invalidated_at" TIMESTAMP(3),
  ADD COLUMN "ip_address" VARCHAR(64);

CREATE UNIQUE INDEX "verification_tokens_challenge_token_key" ON "verification_tokens"("challenge_token");
CREATE INDEX "verification_tokens_challenge_token_idx" ON "verification_tokens"("challenge_token");