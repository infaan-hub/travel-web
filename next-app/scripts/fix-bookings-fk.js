const { PrismaClient } = require("./node_modules/@prisma/client/index.js");
const prisma = new PrismaClient();

prisma.$connect().then(() => {
  console.log("Connected to DB");
  // Change Booking.company FK from Restrict to Cascade
  return prisma.$executeRaw`ALTER TABLE "bookings" DROP CONSTRAINT "bookings_company_id_fkey"`;
}).then(() => {
  return prisma.$executeRaw`ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE`;
}).then(() => {
  // Change Booking.tour FK from Restrict to Cascade  
  return prisma.$executeRaw`ALTER TABLE "bookings" DROP CONSTRAINT "bookings_tour_id_fkey"`;
}).then(() => {
  return prisma.$executeRaw`ALTER TABLE "bookings" ADD CONSTRAINT "bookings_tour_id_fkey" FOREIGN KEY ("tourId") REFERENCES "tours" ("id") ON DELETE CASCADE ON UPDATE CASCADE`;
}).then(() => {
  console.log("All Booking FK constraints updated to Cascade");
  return prisma.$disconnect();
}).catch(e => {
  console.error("Error:", e);
  process.exit(1);
});