import "server-only";
import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import type { Pagination } from "@/lib/api/pagination";
import prisma from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";
import { coordinatePairIssue } from "@/lib/company-domain";
import {
  companyBookingListSerializer,
  companyNotificationSerializer,
  companyTourSerializer,
} from "@/lib/serializers";
import type {
  CompanyBookingListQuery,
  CompanyTourListQuery,
  CompanyWorkspaceProfileUpdateInput,
} from "@/lib/validation/company";

const COMPANY_BOOKING_INCLUDE = {
  tour: true,
  user: true,
  company: true,
} as const;

type AuditActor = {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function getCompanyWorkspaceProfile(companyId: number) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new ApiError(404, "Company not found.");
  return company;
}

/**
 * The company profile update accepts only delegated operational fields. The
 * company's legal identity, registration, status and public visibility are
 * platform-managed and never read from this input.
 */
export async function updateCompanyWorkspaceProfile(
  companyId: number,
  input: CompanyWorkspaceProfileUpdateInput,
  actor: AuditActor,
  imageKeys: {
    logoImageKey?: string | null;
    coverImageKey?: string | null;
  } = {},
) {
  const before = await getCompanyWorkspaceProfile(companyId);
  const nextLatitude =
    input.latitude !== undefined ? input.latitude : before.latitude;
  const nextLongitude =
    input.longitude !== undefined ? input.longitude : before.longitude;
  const coordinateIssue = coordinatePairIssue(nextLatitude, nextLongitude);
  if (coordinateIssue) {
    throw new ApiError(400, coordinateIssue, { latitude: [coordinateIssue] });
  }

  const data: Prisma.CompanyUpdateInput = {};
  const changed: string[] = [];

  const setText = (
    key: keyof CompanyWorkspaceProfileUpdateInput,
    field: keyof Prisma.CompanyUpdateInput,
    fallback = "",
  ) => {
    const value = input[key];
    if (value === undefined) return;
    (data as Record<string, unknown>)[field as string] = value ?? fallback;
    changed.push(String(key));
  };

  setText("description", "description");
  setText("contact_email", "contactEmail");
  setText("contact_phone", "contactPhone");
  setText("address", "address");
  setText("country", "country", before.country);
  setText("alternative_phone", "alternativePhone", "");
  setText("whatsapp_number", "whatsappNumber", "");
  setText("locality", "locality", "");
  setText("district", "district", "");
  setText("region", "region", "");
  setText("website", "website", "");
  if (input.opening_hours !== undefined) {
    data.openingHours =
      input.opening_hours === null
        ? Prisma.DbNull
        : input.opening_hours;
    changed.push("opening_hours");
  }

  if (input.latitude !== undefined) {
    data.latitude = input.latitude;
    changed.push("latitude");
  }
  if (input.longitude !== undefined) {
    data.longitude = input.longitude;
    changed.push("longitude");
  }
  if (input.social_links !== undefined) {
    data.socialLinks =
      input.social_links === null
        ? Prisma.DbNull
        : (input.social_links as Prisma.InputJsonValue);
    changed.push("social_links");
  }
  if (imageKeys.logoImageKey !== undefined) {
    data.logoImageKey = imageKeys.logoImageKey;
    changed.push("logo_image");
  }
  if (imageKeys.coverImageKey !== undefined) {
    data.coverImageKey = imageKeys.coverImageKey;
    changed.push("cover_image");
  }

  if (changed.length === 0) return before;

  const updated = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.profile.update",
    entity: "company",
    entityId: companyId,
    before: { changed },
    after: { changed },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return updated;
}

export async function listCompanyTours(
  companyId: number,
  filters: CompanyTourListQuery,
  pagination: Pagination | null,
) {
  const where: Prisma.TourWhereInput = {
    companyId,
    deletedAt: null,
  };
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { destination: { contains: filters.search, mode: "insensitive" } },
      { shortDescription: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.publication_status) {
    where.publicationStatus = filters.publication_status;
  }

  const [tours, total] = await Promise.all([
    prisma.tour.findMany({
      where,
      include: {
        reviews: true,
        company: { select: { name: true, slug: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 500,
    }),
    prisma.tour.count({ where }),
  ]);

  return { tours, total };
}

export async function getCompanyTour(companyId: number, tourId: number) {
  const tour = await prisma.tour.findFirst({
    where: { id: tourId, companyId, deletedAt: null },
    include: {
      galleryImages: { orderBy: { order: "asc" } },
      itinerary: { orderBy: { day: "asc" } },
      company: { select: { name: true, slug: true } },
      _count: { select: { bookings: true } },
      reviews: {
        where: { status: "approved" },
        include: { user: true },
      },
    },
  });
  if (!tour) throw new ApiError(404, "Tour not found.");
  return tour;
}

export async function listCompanyBookings(
  companyId: number,
  filters: CompanyBookingListQuery,
  pagination: Pagination | null,
) {
  const where: Prisma.BookingWhereInput = { companyId };
  if (filters.status) where.status = filters.status;
  if (filters.tour) where.tourId = filters.tour;
  if (filters.travel_date) {
    where.travelDate = new Date(`${filters.travel_date}T00:00:00.000Z`);
  }
  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search, mode: "insensitive" } },
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search, mode: "insensitive" } },
      { tourTitleSnapshot: { contains: filters.search, mode: "insensitive" } },
      { tour: { title: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { tour: true, user: true },
      orderBy: { createdAt: "desc" },
      skip: pagination?.skip ?? 0,
      take: pagination?.take ?? 500,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: bookings.map((booking) => companyBookingListSerializer(booking)),
    total,
  };
}

export async function getCompanyBooking(companyId: number, bookingId: number) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, companyId },
    include: COMPANY_BOOKING_INCLUDE,
  });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}

export async function getCompanyBookingHistory(
  companyId: number,
  bookingId: number,
) {
  return prisma.auditLog.findMany({
    where: {
      companyId,
      entity: "booking",
      entityId: String(bookingId),
    },
    include: {
      actor: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
}

export type CompanyDashboardData = Awaited<
  ReturnType<typeof getCompanyDashboard>
>;

export async function getCompanyDashboard(companyId: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const inThirtyDays = new Date(today);
  inThirtyDays.setUTCDate(inThirtyDays.getUTCDate() + 30);

  const [
    bookingGroups,
    tourGroups,
    travelersAggregate,
    upcomingRows,
    recentBookings,
    recentTours,
    recentActivity,
    notifications,
  ] = await Promise.all([
    prisma.booking.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.tour.groupBy({
      by: ["publicationStatus"],
      where: { companyId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: {
        companyId,
        status: { not: "cancelled" },
        travelDate: { gte: today },
      },
      _sum: { travelers: true },
    }),
    prisma.booking.findMany({
      where: {
        companyId,
        status: { not: "cancelled" },
        travelDate: { gte: today, lte: inThirtyDays },
      },
      select: { travelDate: true, travelers: true },
      orderBy: { travelDate: "asc" },
      take: 50,
    }),
    prisma.booking.findMany({
      where: { companyId },
      include: { tour: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.tour.findMany({
      where: { companyId, deletedAt: null },
      include: {
        reviews: true,
        company: { select: { name: true, slug: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { companyId },
      include: { actor: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.notification.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const bookingCounts = { pending: 0, confirmed: 0, cancelled: 0 };
  for (const group of bookingGroups) {
    bookingCounts[group.status] = group._count._all;
  }
  const toursTotal = tourGroups.reduce(
    (total, group) => total + group._count._all,
    0,
  );
  const toursPublished =
    tourGroups.find((group) => group.publicationStatus === "PUBLISHED")?._count
      ._all ?? 0;

  const upcomingByDate = new Map<
    string,
    { date: string; bookings: number; travelers: number }
  >();
  for (const row of upcomingRows) {
    const date = row.travelDate.toISOString().slice(0, 10);
    const existing = upcomingByDate.get(date) ?? {
      date,
      bookings: 0,
      travelers: 0,
    };
    existing.bookings += 1;
    existing.travelers += row.travelers;
    upcomingByDate.set(date, existing);
  }

  return {
    stats: {
      bookings_total:
        bookingCounts.pending +
        bookingCounts.confirmed +
        bookingCounts.cancelled,
      bookings_pending: bookingCounts.pending,
      bookings_confirmed: bookingCounts.confirmed,
      bookings_cancelled: bookingCounts.cancelled,
      travelers_upcoming: travelersAggregate._sum.travelers ?? 0,
      tours_total: toursTotal,
      tours_published: toursPublished,
      tours_unpublished: toursTotal - toursPublished,
    },
    upcoming: Array.from(upcomingByDate.values()).slice(0, 5),
    recent_bookings: recentBookings.map(companyBookingListSerializer),
    recent_tours: recentTours.map(companyTourSerializer),
    recent_activity: recentActivity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId,
      actor: entry.actor
        ? { id: entry.actor.id, username: entry.actor.username }
        : null,
      created_at: entry.createdAt.toISOString(),
    })),
    notifications: notifications.map(companyNotificationSerializer),
  };
}

export type CompanyAnalyticsData = Awaited<
  ReturnType<typeof getCompanyAnalytics>
>;

export async function getCompanyAnalytics(companyId: number) {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );

  const [statusGroups, monthlyRows, tourPerformance, travelerAggregate, toursTotal] =
    await Promise.all([
      prisma.booking.groupBy({
        by: ["status"],
        where: { companyId },
        _count: { _all: true, totalPriceAtBooking: true },
        _sum: { totalPriceAtBooking: true },
      }),
      prisma.booking.findMany({
        where: { companyId, createdAt: { gte: start } },
        select: { createdAt: true, travelers: true, status: true },
      }),
      prisma.tour.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          title: true,
          publicationStatus: true,
          _count: { select: { bookings: true } },
        },
        take: 50,
      }),
      prisma.booking.aggregate({
        where: { companyId, status: { not: "cancelled" } },
        _sum: { travelers: true },
      }),
      prisma.tour.count({ where: { companyId, deletedAt: null } }),
    ]);

  const statusCounts = { pending: 0, confirmed: 0, cancelled: 0 };
  let bookedValue = 0;
  let confirmedValue = 0;
  let bookingsWithPrice = 0;
  let bookingsWithoutPrice = 0;
  for (const group of statusGroups) {
    statusCounts[group.status] = group._count._all;
    const groupValue = Number(group._sum.totalPriceAtBooking ?? 0);
    bookingsWithPrice += group._count.totalPriceAtBooking;
    bookingsWithoutPrice += group._count._all - group._count.totalPriceAtBooking;
    if (group.status !== "cancelled") bookedValue += groupValue;
    if (group.status === "confirmed") confirmedValue = groupValue;
  }

  const monthly = new Map<
    string,
    { month: string; label: string; bookings: number; travelers: number }
  >();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const month = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const key = month.toISOString().slice(0, 7);
    monthly.set(key, {
      month: key,
      label: month.toLocaleDateString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      bookings: 0,
      travelers: 0,
    });
  }
  for (const row of monthlyRows) {
    const entry = monthly.get(row.createdAt.toISOString().slice(0, 7));
    if (!entry) continue;
    entry.bookings += 1;
    if (row.status !== "cancelled") entry.travelers += row.travelers;
  }

  return {
    booking_status: [
      { name: "Pending", value: statusCounts.pending },
      { name: "Confirmed", value: statusCounts.confirmed },
      { name: "Cancelled", value: statusCounts.cancelled },
    ],
    monthly_bookings: Array.from(monthly.values()),
    tour_performance: tourPerformance
      .map((tour) => ({
        id: tour.id,
        name:
          tour.title.length > 28
            ? `${tour.title.slice(0, 27)}...`
            : tour.title,
        bookings: tour._count.bookings,
        published: tour.publicationStatus === "PUBLISHED",
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8),
    totals: {
      bookings:
        statusCounts.pending + statusCounts.confirmed + statusCounts.cancelled,
      travelers: travelerAggregate._sum.travelers ?? 0,
      tours: toursTotal,
      booked_value_tzs: bookedValue,
      confirmed_value_tzs: confirmedValue,
      bookings_with_price: bookingsWithPrice,
      bookings_without_price: bookingsWithoutPrice,
    },
  };
}
