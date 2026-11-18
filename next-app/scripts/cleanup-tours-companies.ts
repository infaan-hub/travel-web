import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.funnelEvent.deleteMany({});
    await tx.review.deleteMany({});
    await tx.booking.deleteMany({});
    await tx.transportBooking.deleteMany({});
    await tx.transportTripRequest.deleteMany({});
    await tx.workspaceTask.deleteMany({});
    await tx.workspace.deleteMany({});
    await tx.tourGalleryImage.deleteMany({});
    await tx.itineraryItem.deleteMany({});
    await tx.tourTranslation.deleteMany({});
    await tx.tourDeparture.deleteMany({});
    await tx.tour.deleteMany({});
    await tx.privateHireService.deleteMany({});
    await tx.privateHireDriver.deleteMany({});
    await tx.privateHireVehicle.deleteMany({});
    await tx.companyTrip.deleteMany({});
    await tx.companyMembership.deleteMany({});
    await tx.company.deleteMany({});
  });
  console.log("Cleanup complete: companies, tours, and related records deleted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
