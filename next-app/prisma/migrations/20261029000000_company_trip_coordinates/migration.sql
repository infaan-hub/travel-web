-- Store the map coordinates chosen for a company trip.
ALTER TABLE "company_trips" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
