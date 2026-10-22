/**
 * Verify the demo seed without writing anything.
 *
 * Run after `npm run db:seed` (ideally twice, to prove idempotency) against the
 * same database:
 *
 *   npm run db:seed:check
 *
 * The check intentionally looks for the exact demo titles and field values. It
 * exits non-zero if the rows are missing, duplicated, or have empty fields.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const companySlug = process.env.SEED_COMPANY_SLUG ?? "travel-island-demo";
const companyOwnerUsername = process.env.SEED_COMPANY_OWNER_USERNAME ?? "demo-owner";

try {
  const company = await prisma.company.findUnique({
    where: { slug: companySlug },
    select: { id: true, name: true, status: true, isPublic: true },
  });
  expect(Boolean(company), `demo company ${companySlug} is missing`);
  expect(company?.status === "ACTIVE", `demo company ${companySlug} is not ACTIVE`);
  expect(company?.isPublic === true, `demo company ${companySlug} is not public`);

  const companyOwner = await prisma.user.findUnique({
    where: { username: companyOwnerUsername },
    select: { id: true, isActive: true, deletedAt: true },
  });
  expect(Boolean(companyOwner), `company owner ${companyOwnerUsername} is missing`);
  expect(companyOwner?.isActive === true, `company owner ${companyOwnerUsername} is inactive`);
  expect(companyOwner?.deletedAt === null, `company owner ${companyOwnerUsername} is deleted`);

  const ownerMemberships = company
    ? await prisma.companyMembership.count({
        where: {
          companyId: company.id,
          userId: companyOwner?.id ?? -1,
          role: "OWNER",
          status: "ACTIVE",
        },
      })
    : 0;
  expect(ownerMemberships === 1, `expected 1 active OWNER membership, found ${ownerMemberships}`);

  const tours = await prisma.tour.findMany({
    where: {
      title: {
        in: ["Stone Town Walking Tour", "Serengeti Safari Adventure"],
      },
      deletedAt: null,
    },
    select: {
      title: true,
      shortDescription: true,
      companyId: true,
      publicationStatus: true,
      publishedAt: true,
    },
  });
  expect(tours.length === 2, `expected 2 demo tours, found ${tours.length}`);
  for (const tour of tours) {
    expect(tour.shortDescription.trim().length > 0, `${tour.title} has no shortDescription`);
    expect(tour.companyId === company?.id, `${tour.title} is not owned by ${companySlug}`);
    expect(tour.publicationStatus === "PUBLISHED", `${tour.title} is not PUBLISHED`);
    expect(tour.publishedAt instanceof Date, `${tour.title} has no publishedAt`);
  }

  const attractions = await prisma.attraction.findMany({
    where: { name: { in: ["Old Fort", "Changuu Aquarium"] }, deletedAt: null },
    select: { name: true, bestTimeToVisit: true, entryFee: true },
  });
  expect(attractions.length === 2, `expected 2 demo attractions, found ${attractions.length}`);
  for (const attraction of attractions) {
    expect(
      attraction.bestTimeToVisit.trim().length > 0,
      `${attraction.name} has no bestTimeToVisit`,
    );
    expect(attraction.entryFee.trim().length > 0, `${attraction.name} has no entryFee`);
  }

  const tips = await prisma.travelTip.count({
    where: {
      title: { in: ["Best time to visit Zanzibar", "Getting around Stone Town"] },
    },
  });
  expect(tips === 2, `expected 2 demo travel tips, found ${tips}`);

  const admins = await prisma.user.count({ where: { isSuperuser: true, deletedAt: null } });
  expect(admins >= 1, "no active superuser found");

  const homeSettings = await prisma.homeSetting.count();
  expect(homeSettings === 1, `expected 1 home-settings row, found ${homeSettings}`);

  console.log(
    JSON.stringify(
      {
        company: companySlug,
        companyOwnerMemberships: ownerMemberships,
        tours: tours.length,
        attractions: attractions.length,
        tips,
        admins,
        homeSettings,
        failures,
      },
      null,
      2,
    ),
  );
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
  console.error(error);
} finally {
  await prisma.$disconnect();
}

if (failures.length) {
  console.error(`Seed check failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Seed check passed.");
}
