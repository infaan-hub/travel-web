-- Phase 3: company domain, tour publication state and booking attribution.
-- Additive migration: no existing columns/tables are dropped. Existing tours
-- become DRAFT and keep company_id NULL; no company is invented.

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompanyBusinessType" AS ENUM ('TOUR_OPERATOR', 'SAFARI_OPERATOR', 'EXCURSION_PROVIDER', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "CompanyMembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "TourPublicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "registration_reference" TEXT,
    "business_type" "CompanyBusinessType" NOT NULL DEFAULT 'TOUR_OPERATOR',
    "logo_image_key" TEXT,
    "cover_image_key" TEXT,
    "contact_email" TEXT NOT NULL DEFAULT '',
    "contact_phone" TEXT NOT NULL DEFAULT '',
    "alternative_phone" TEXT,
    "whatsapp_number" TEXT,
    "address" TEXT NOT NULL DEFAULT '',
    "locality" TEXT,
    "district" TEXT,
    "region" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Tanzania',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "social_links" JSONB,
    "opening_hours" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "suspended_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "search_vector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple',
          coalesce("name", '') || ' ' ||
          coalesce("description", '') || ' ' ||
          coalesce("locality", '') || ' ' ||
          coalesce("region", '') || ' ' ||
          coalesce("country", ''))
      ) STORED,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_memberships" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "CompanyRole" NOT NULL,
    "status" "CompanyMembershipStatus" NOT NULL DEFAULT 'INVITED',
    "assigned_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "company_memberships_pkey" PRIMARY KEY ("id")
);

-- AlterTable: booking attribution and historical snapshots (nullable for legacy rows)
ALTER TABLE "bookings" ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "company_name_snapshot" TEXT,
ADD COLUMN     "tour_title_snapshot" TEXT;

-- AlterTable: tours default to DRAFT; legacy rows intentionally remain unowned
ALTER TABLE "tours" ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "moderation_note" TEXT,
ADD COLUMN     "publication_status" "TourPublicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "published_by_user_id" INTEGER;

-- AlterTable: company-aware audit and notifications
ALTER TABLE "audit_logs" ADD COLUMN     "company_id" INTEGER;
ALTER TABLE "notifications" ADD COLUMN     "company_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE INDEX "companies_status_is_public_idx" ON "companies"("status", "is_public");
CREATE INDEX "companies_business_type_idx" ON "companies"("business_type");
CREATE INDEX "companies_region_idx" ON "companies"("region");
CREATE INDEX "companies_locality_idx" ON "companies"("locality");
CREATE INDEX "companies_created_at_idx" ON "companies"("created_at");
CREATE INDEX "companies_search_vector_idx" ON "companies" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "company_memberships_user_id_status_idx" ON "company_memberships"("user_id", "status");
CREATE INDEX "company_memberships_company_id_role_status_idx" ON "company_memberships"("company_id", "role", "status");

-- Preserve revoked membership history while preventing ambiguous active roles.
-- Prisma cannot express partial unique indexes, so this is raw SQL only.
CREATE UNIQUE INDEX "company_memberships_active_company_user_key"
  ON "company_memberships"("company_id", "user_id")
  WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");
CREATE INDEX "bookings_company_id_status_travel_date_idx" ON "bookings"("company_id", "status", "travel_date");
CREATE INDEX "bookings_company_id_created_at_idx" ON "bookings"("company_id", "created_at");
CREATE INDEX "notifications_company_id_created_at_idx" ON "notifications"("company_id", "created_at");
CREATE INDEX "tours_company_id_publication_status_deleted_at_idx" ON "tours"("company_id", "publication_status", "deleted_at");
CREATE INDEX "tours_company_id_created_at_idx" ON "tours"("company_id", "created_at");
CREATE INDEX "tours_publication_status_deleted_at_idx" ON "tours"("publication_status", "deleted_at");

-- Preserve historical bookings: deleting a tour/user must not cascade the booking away.
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_tour_id_fkey";
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tours" ADD CONSTRAINT "tours_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tours" ADD CONSTRAINT "tours_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
