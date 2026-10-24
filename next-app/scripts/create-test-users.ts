import "dotenv/config";
import prisma from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const tourist = await prisma.user.upsert({
    where: { username: "tourist" },
    update: { password: await hashPassword("TouristPass123!"), accountType: "CUSTOMER", isActive: true },
    create: { username: "tourist", email: "tourist@example.com", password: await hashPassword("TouristPass123!"), accountType: "CUSTOMER", profile: { create: {} } },
  });
  console.log("tourist", tourist.id);

  const companyUser = await prisma.user.upsert({
    where: { username: "company" },
    update: { password: await hashPassword("CompanyPass123!"), accountType: "TOUR_COMPANY", isActive: true },
    create: { username: "company", email: "company@example.com", password: await hashPassword("CompanyPass123!"), accountType: "TOUR_COMPANY", profile: { create: {} } },
  });
  console.log("company user", companyUser.id);

  let company = await prisma.company.findFirst({ where: { slug: "test-company" } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: "Test Company", slug: "test-company", status: "ACTIVE", isPublic: true, createdByUserId: companyUser.id },
    });
  }
  await prisma.companyMembership.upsert({
    where: { companyId_userId: { companyId: company.id, userId: companyUser.id } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: { companyId: company.id, userId: companyUser.id, role: "OWNER", status: "ACTIVE", assignedByUserId: companyUser.id },
  });
  console.log("company", company.id);
}
main().finally(() => prisma.$disconnect());
