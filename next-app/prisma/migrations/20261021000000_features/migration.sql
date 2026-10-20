-- Feature batch: audit log, push notifications, in-app notifications, soft deletes,
-- booking references, capacity, full-text search vectors and supporting indexes.

ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

ALTER TABLE "tours" ADD COLUMN "max_travelers" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "tours" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "tours" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce("title", '') || ' ' ||
      coalesce("short_description", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce("destination", ''))
  ) STORED;
CREATE INDEX "tours_deleted_at_idx" ON "tours"("deleted_at");
CREATE INDEX "tours_destination_idx" ON "tours"("destination");
CREATE INDEX "tours_search_vector_idx" ON "tours" USING GIN ("search_vector");

ALTER TABLE "attractions" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "attractions" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce("name", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce("location", '') || ' ' ||
      coalesce("region", '') || ' ' ||
      coalesce("activities", ''))
  ) STORED;
CREATE INDEX "attractions_deleted_at_idx" ON "attractions"("deleted_at");
CREATE INDEX "attractions_search_vector_idx" ON "attractions" USING GIN ("search_vector");

ALTER TABLE "travel_tips" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "travel_tips" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce("title", '') || ' ' ||
      coalesce("content", '') || ' ' ||
      coalesce("category", ''))
  ) STORED;
CREATE INDEX "travel_tips_deleted_at_idx" ON "travel_tips"("deleted_at");
CREATE INDEX "travel_tips_search_vector_idx" ON "travel_tips" USING GIN ("search_vector");

ALTER TABLE "bookings" ADD COLUMN "reference" TEXT;
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference") WHERE "reference" IS NOT NULL;
CREATE INDEX "bookings_tour_id_travel_date_idx" ON "bookings"("tour_id", "travel_date");

CREATE TABLE "audit_logs" (
  "id" SERIAL NOT NULL,
  "actor_id" INTEGER,
  "action" VARCHAR(80) NOT NULL,
  "entity" VARCHAR(80) NOT NULL,
  "entity_id" VARCHAR(64),
  "before" JSONB,
  "after" JSONB,
  "ip_address" VARCHAR(64),
  "user_agent" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "push_subscriptions" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "endpoint" TEXT NOT NULL,
  "p256dh" VARCHAR(255) NOT NULL,
  "auth" VARCHAR(255) NOT NULL,
  "user_agent" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER,
  "title" VARCHAR(160) NOT NULL,
  "body" TEXT NOT NULL,
  "url" VARCHAR(500),
  "tag" VARCHAR(80),
  "read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
