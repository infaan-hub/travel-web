/**
 * Seeds demo content so a fresh environment is immediately usable.
 * Idempotent: existing rows are updated instead of duplicated.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

async function main() {
  const password = await hash(ADMIN_PASSWORD, {
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

  const tours = [
    {
      title: "Stone Town Walking Tour",
      slug: "stone-town-walking-tour",
      description:
        "A guided walk through the narrow lanes, spice market and old fort of Stone Town.",
      short_description: "Historic lanes, spice market and the old fort.",
      price: "45.00",
      duration: "3 hours",
      destination: "Stone Town, Zanzibar",
      category: "zanzibar" as const,
      includes: ["Local guide", "Entrance fees", "Bottled water"],
      excludes: ["Hotel pickup"],
      available: true,
      featured: true,
    },
    {
      title: "Serengeti Safari Adventure",
      slug: "serengeti-safari-adventure",
      description:
        "Three days on the Serengeti plains with a private 4x4, sunrise game drives and a bush camp.",
      short_description: "Three days of sunrise game drives and open savannah.",
      price: "1250.00",
      duration: "3 days",
      destination: "Serengeti, Tanzania",
      category: "tanzania" as const,
      includes: ["Private 4x4 and driver", "Park fees", "Full board"],
      excludes: ["Flights to Kilimanjaro"],
      available: true,
      featured: true,
    },
  ];

  for (const tour of tours) {
    const existing = await prisma.tour.findFirst({ where: { title: tour.title } });
    if (existing) {
      await prisma.tour.update({
        where: { id: existing.id },
        data: { ...tour, maxTravelers: 10 },
      });
    } else {
      await prisma.tour.create({ data: { ...tour, maxTravelers: 10 } });
    }
  }

  const attractions = [
    {
      name: "Old Fort",
      location: "Stone Town, Zanzibar",
      region: "Zanzibar",
      category: "national_park",
      description: "A 17th century sea fort with sweeping views of the harbour.",
      best_time_to_visit: "Morning",
      entry_fee: "TSh 5,000",
      activities: "Guided tours, photography",
    },
    {
      name: "Changuu Aquarium",
      location: "Stone Town, Zanzibar",
      region: "Zanzibar",
      category: "cultural",
      description: "A hidden gem for snorkelling in crystal-clear water.",
      best_time_to_visit: "Afternoon",
      entry_fee: "TSh 10,000",
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

  console.log(`Seed complete. Administrator: ${admin.username} (${ADMIN_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
