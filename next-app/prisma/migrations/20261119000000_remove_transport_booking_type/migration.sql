-- Remove booking type from transport bookings.
ALTER TABLE "transport_bookings" DROP COLUMN IF EXISTS "booking_type";
DROP TYPE IF EXISTS "TransportBookingType";