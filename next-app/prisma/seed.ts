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

  const extraCompanies: Prisma.CompanyUncheckedCreateInput[] = [
    {
      name: "Serengeti Sunset Safaris",
      slug: "serengeti-sunset-safaris",
      description:
        "Boutique safari operator offering small-group wildlife drives, walking safaris and photographic trips across the Serengeti, Ngorongoro and Tarangire. Family-run since 2014.",
      businessType: "SAFARI_OPERATOR",
      registrationReference: "REG-SSS-2014-001",
      contactEmail: "hello@serengetisunset.co.tz",
      contactPhone: "255754123456",
      alternativePhone: "255765123456",
      whatsappNumber: "255754123456",
      address: "Arusha-Moshi Road, Njiro",
      locality: "Njiro",
      district: "Arusha Urban",
      region: "Arusha",
      country: "Tanzania",
      latitude: -3.3869,
      longitude: 36.6829,
      website: "https://serengetisunset.co.tz",
      socialLinks: {
        facebook: "https://facebook.com/serengetisunset",
        instagram: "https://instagram.com/serengetisunset",
        x: "https://x.com/serengetisunset",
      },
      openingHours: "Daily 06:00-20:00",
      status: "ACTIVE",
      isPublic: true,
      createdByUserId: admin.id,
    },
    {
      name: "Zanzibar Dhow Cruises",
      slug: "zanzibar-dhow-cruises",
      description:
        "Traditional dhow sailing experiences: sunset cruises, snorkelling trips to Mnemba Atoll and sandbank picnics. Certified local skippers and small-group departures only.",
      businessType: "EXCURSION_PROVIDER",
      registrationReference: "REG-ZDC-2019-042",
      contactEmail: "info@zanzibardhow.com",
      contactPhone: "255777888999",
      whatsappNumber: "255777888999",
      address: "Forodhani Gardens, Stone Town",
      locality: "Stone Town",
      district: "Mjini Magharibi",
      region: "Zanzibar",
      country: "Tanzania",
      latitude: -6.1639,
      longitude: 39.1885,
      website: "https://zanzibardhow.com",
      socialLinks: {
        facebook: "https://facebook.com/zanzibardhow",
        instagram: "https://instagram.com/zanzibardhow",
        tripadvisor: "https://tripadvisor.com/zanzibardhow",
      },
      openingHours: "Daily 09:00-19:00",
      status: "ACTIVE",
      isPublic: true,
      createdByUserId: admin.id,
    },
    {
      name: "Kilimanjaro Trekking Co.",
      slug: "kilimanjaro-trekking-co",
      description:
        "Licensed Mount Kilimanjaro outfitter specialising in Machame, Lemosho and Northern Circuit routes. KPAP partner with fair-wage porters and certified wilderness guides.",
      businessType: "TOUR_OPERATOR",
      registrationReference: "REG-KTC-2016-017",
      contactEmail: "trek@kilimanjarotrekking.co.tz",
      contactPhone: "255784555666",
      alternativePhone: "255713555666",
      whatsappNumber: "255784555666",
      address: "Moshi Town Centre, Kilimanjaro Region",
      locality: "Moshi",
      district: "Moshi Urban",
      region: "Kilimanjaro",
      country: "Tanzania",
      latitude: -3.35,
      longitude: 37.34,
      website: "https://kilimanjarotrekking.co.tz",
      socialLinks: {
        facebook: "https://facebook.com/kilimanjarotrekking",
        instagram: "https://instagram.com/kilimanjarotrekking",
        youtube: "https://youtube.com/@kilimanjarotrekking",
      },
      openingHours: "Mon-Fri 08:00-17:00",
      status: "ACTIVE",
      isPublic: true,
      createdByUserId: admin.id,
    },
  ];

  for (const company of extraCompanies) {
    await prisma.company.upsert({
      where: { slug: company.slug as string },
      update: {
        status: "ACTIVE",
        isPublic: true,
        suspendedAt: null,
        archivedAt: null,
      },
      create: company,
    });
  }

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
    {
      title: "Zanzibar Spice & Culture Tour",
      description:
        "A full-day journey through Zanzibar's spice farms, historic Stone Town and a traditional village lunch.",
      shortDescription: "Spice farms, Stone Town and a village lunch.",
      price: "95.00",
      duration: "8 hours",
      destination: "Zanzibar, Tanzania",
      category: "zanzibar",
      includes: ["Spice farm guide", "Traditional lunch", "Hotel pickup"],
      excludes: ["Personal shopping"],
      image: "/uploads/tours/tour1.jpg",
      available: true,
      featured: false,
      companyId: demoCompany.id,
      publicationStatus: "PUBLISHED",
      publishedByUserId: companyOwner.id,
    },
    {
      title: "Kilimanjaro Summit Trek",
      description:
        "A 7-day guided ascent of Mount Kilimanjaro via the Machame route with acclimatisation days and full support crew.",
      shortDescription: "Seven-day Machame route summit attempt.",
      price: "2400.00",
      duration: "7 days",
      destination: "Kilimanjaro, Tanzania",
      category: "tanzania",
      includes: ["Certified mountain guide", "Porters", "Park fees", "Meals on mountain"],
      image: "/uploads/tours/tour2.jpg",
      available: true,
      featured: true,
      companyId: demoCompany.id,
      publicationStatus: "PUBLISHED",
      publishedByUserId: companyOwner.id,
    },
    {
      title: "Serengeti & Ngorongoro Combo",
      description:
        "Five days combining Serengeti game drives with a Ngorongoro Crater descent and Maasai cultural visit.",
      shortDescription: "Serengeti drives plus Ngorongoro Crater descent.",
      price: "1850.00",
      duration: "5 days",
      destination: "Serengeti & Ngorongoro, Tanzania",
      category: "tanzania",
      includes: ["4x4 safari vehicle", "Park fees", "Full board", "Maasai visit"],
      image: "/uploads/tours/tour3.jpg",
      available: true,
      featured: false,
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
    {
      name: "Ngorongoro Crater Viewpoint",
      location: "Ngorongoro, Tanzania",
      region: "Arusha",
      category: "national_park",
      image: "/uploads/attractions/A_Dip_in_Maalum_Cave.jpg",
      description: "Panoramic views over the world's largest intact volcanic caldera.",
      bestTimeToVisit: "Early morning",
      entryFee: "TSh 70,000",
      activities: "Wildlife viewing, photography",
    },
    {
      name: "Serengeti Visitor Centre",
      location: "Serengeti, Tanzania",
      region: "Mara",
      category: "cultural",
      image: "/uploads/attractions/A_Dip_in_Maalum_Cave.jpg",
      description: "Interactive exhibits on Serengeti ecology and the great migration.",
      bestTimeToVisit: "Midday",
      entryFee: "TSh 20,000",
      activities: "Exhibits, guided talks",
    },
    {
      name: "Mount Kilimanjaro National Park Gate",
      location: "Moshi, Tanzania",
      region: "Kilimanjaro",
      category: "national_park",
      image: "/uploads/attractions/A_Dip_in_Maalum_Cave.jpg",
      description: "Gateway to Africa's highest peak with trail information and permits.",
      bestTimeToVisit: "Morning",
      entryFee: "TSh 10,000",
      activities: "Hiking start, registration",
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
