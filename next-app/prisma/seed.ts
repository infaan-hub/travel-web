/**
 * Seeds demo content so a fresh environment is immediately usable.
 * Idempotent: existing rows are updated instead of duplicated.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
const COMPANY_OWNER_PASSWORD = process.env.SEED_COMPANY_OWNER_PASSWORD ?? "DemoOwner123!";
const COMPANY_SLUG = process.env.SEED_COMPANY_SLUG ?? "travel-island-demo";

async function main() {
  const password = await hash(ADMIN_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const companyOwnerPassword = await hash(COMPANY_OWNER_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const admin = await prisma.user.upsert({
    where: { username: process.env.SEED_ADMIN_USERNAME ?? "admin" },
    update: {},
    create: {
      username: process.env.SEED_ADMIN_USERNAME ?? "admin",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@travelisland.app",
      password,
      isStaff: true,
      isSuperuser: true,
      profile: { create: {} },
    },
  });

  const companyOwner = await prisma.user.upsert({
    where: { username: process.env.SEED_COMPANY_OWNER_USERNAME ?? "demo-owner" },
    update: { isActive: true, deletedAt: null },
    create: {
      username: process.env.SEED_COMPANY_OWNER_USERNAME ?? "demo-owner",
      email: process.env.SEED_COMPANY_OWNER_EMAIL ?? "owner@travelisland.demo",
      password: companyOwnerPassword,
      emailVerified: true,
      profile: { create: { fullName: "Demo Company Owner" } },
    },
  });

  const demoCompany = await prisma.company.upsert({
    where: { slug: COMPANY_SLUG },
    update: {
      status: "ACTIVE",
      isPublic: true,
      suspendedAt: null,
      archivedAt: null,
    },
    create: {
      name: "Travel Island Demo",
      slug: COMPANY_SLUG,
      description:
        "A non-production demo company used to exercise multi-company ownership, publication and booking attribution.",
      businessType: "TOUR_OPERATOR",
      contactEmail: "hello@travelisland.demo",
      contactPhone: "255711252758",
      whatsappNumber: "255711252758",
      address: "Shangani, Stone Town",
      locality: "Stone Town",
      district: "Mjini Magharibi",
      region: "Zanzibar",
      country: "Tanzania",
      latitude: -6.1622,
      longitude: 39.192,
      website: "https://travelisland.vercel.app",
      openingHours: "Mon-Sat 08:00-18:00",
      status: "ACTIVE",
      isPublic: true,
      createdByUserId: admin.id,
    },
  });

  const activeMembership = await prisma.companyMembership.findFirst({
    where: { companyId: demoCompany.id, userId: companyOwner.id, status: "ACTIVE" },
  });
  if (activeMembership) {
    await prisma.companyMembership.update({
      where: { id: activeMembership.id },
      data: { role: "OWNER", assignedByUserId: admin.id, revokedAt: null },
    });
  } else {
    const previousMembership = await prisma.companyMembership.findFirst({
      where: { companyId: demoCompany.id, userId: companyOwner.id },
      orderBy: { id: "desc" },
    });
    if (previousMembership) {
      await prisma.companyMembership.update({
        where: { id: previousMembership.id },
        data: {
          role: "OWNER",
          status: "ACTIVE",
          assignedByUserId: admin.id,
          revokedAt: null,
        },
      });
    } else {
      await prisma.companyMembership.create({
        data: {
          companyId: demoCompany.id,
          userId: companyOwner.id,
          role: "OWNER",
          status: "ACTIVE",
          assignedByUserId: admin.id,
        },
      });
    }
  }

  const tours: Prisma.TourUncheckedCreateInput[] = [
    {
      title: "Stone Town Walking Tour",
      description:
        "A guided walk through the narrow lanes, spice market and old fort of Stone Town.",
      shortDescription: "Historic lanes, spice market and the old fort.",
      price: "45.00",
      duration: "3 hours",
      destination: "Stone Town, Zanzibar",
      category: "zanzibar",
      includes: ["Local guide", "Entrance fees", "Bottled water"],
      excludes: ["Hotel pickup"],
      available: true,
      featured: true,
      companyId: demoCompany.id,
      publicationStatus: "PUBLISHED",
      publishedByUserId: companyOwner.id,
    },
    {
      title: "Serengeti Safari Adventure",
      description:
        "Three days on the Serengeti plains with a private 4x4, sunrise game drives and a bush camp.",
      shortDescription: "Three days of sunrise game drives and open savannah.",
      price: "1250.00",
      duration: "3 days",
      destination: "Serengeti, Tanzania",
      category: "tanzania",
      includes: ["Private 4x4 and driver", "Park fees", "Full board"],
      excludes: ["Flights to Kilimanjaro"],
      available: true,
      featured: true,
      companyId: demoCompany.id,
      publicationStatus: "PUBLISHED",
      publishedByUserId: companyOwner.id,
    },
  ];

  for (const tour of tours) {
    const existing = await prisma.tour.findFirst({ where: { title: tour.title } });
    if (existing) {
      await prisma.tour.update({
        where: { id: existing.id },
        data: {
          ...tour,
          maxTravelers: 10,
          // Keep the original publication time when re-running the seed.
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
    } else {
      await prisma.tour.create({
        data: { ...tour, maxTravelers: 10, publishedAt: new Date() },
      });
    }
  }

  const attractions: Prisma.AttractionCreateInput[] = [
    {
      name: "Old Fort",
      location: "Stone Town, Zanzibar",
      region: "Zanzibar",
      category: "national_park",
      description: "A 17th century sea fort with sweeping views of the harbour.",
      bestTimeToVisit: "Morning",
      entryFee: "TSh 5,000",
      activities: "Guided tours, photography",
    },
    {
      name: "Changuu Aquarium",
      location: "Stone Town, Zanzibar",
      region: "Zanzibar",
      category: "cultural",
      description: "A hidden gem for snorkelling in crystal-clear water.",
      bestTimeToVisit: "Afternoon",
      entryFee: "TSh 10,000",
      activities: "Snorkelling, relaxation",
    },
  ];

  for (const attraction of attractions) {
    const existing = await prisma.attraction.findFirst({ where: { name: attraction.name } });
    if (existing) {
      await prisma.attraction.update({ where: { id: existing.id }, data: attraction });
    } else {
      await prisma.attraction.create({ data: attraction });
    }
  }

  const tips = [
    {
      title: "Best time to visit Zanzibar",
      category: "travel-tips",
      content:
        "June to October is the driest season, with warm temperatures and calm seas for diving.",
    },
    {
      title: "Getting around Stone Town",
      category: "practical",
      content:
        "Tuk-tuks, bicycles and walking are enough for Stone Town. Use a driver for longer trips.",
    },
  ];

  for (const tip of tips) {
    const existing = await prisma.travelTip.findFirst({ where: { title: tip.title } });
    if (existing) {
      await prisma.travelTip.update({ where: { id: existing.id }, data: tip });
    } else {
      await prisma.travelTip.create({ data: { ...tip, published: true } });
    }
  }

  const hotel = await prisma.hotel.findFirst({ where: { name: "Zanzibar Harbour Hotel" } });
  if (!hotel) {
    await prisma.hotel.create({
      data: {
        name: "Zanzibar Harbour Hotel",
        location: "Stone Town, Zanzibar",
        phone: "255711252758",
        rooms: {
          create: [
            { name: "Deluxe Ocean View", price: "220.00", description: "Sea view with breakfast." },
            { name: "Garden Suite", price: "180.00", description: "Quiet garden suite." },
          ],
        },
      },
    });
  }

  const driver = await prisma.travelDriver.findFirst({ where: { name: "Juma" } });
  if (!driver) {
    await prisma.travelDriver.create({ data: { name: "Juma", phone: "0711000100" } });
  }

  const vehicle = await prisma.travelVehicle.findFirst({ where: { carName: "Toyota Land Cruiser" } });
  if (!vehicle) {
    await prisma.travelVehicle.create({
      data: { carName: "Toyota Land Cruiser", plateNumber: "TZS-421-A" },
    });
  }

  await prisma.homeSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log(
    `Seed complete. Administrator: ${admin.username} (${ADMIN_PASSWORD}); company owner: ${companyOwner.username} (${COMPANY_OWNER_PASSWORD}) for ${demoCompany.slug}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
