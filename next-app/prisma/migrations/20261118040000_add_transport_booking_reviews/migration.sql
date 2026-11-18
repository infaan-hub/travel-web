-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "transport_booking_id" INTEGER;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_transport_booking_id_fkey" FOREIGN KEY ("transport_booking_id") REFERENCES "transport_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "reviews_transport_booking_id_idx" ON "reviews"("transport_booking_id");
