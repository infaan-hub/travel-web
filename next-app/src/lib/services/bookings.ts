import "server-only";
import { randomInt } from "node:crypto";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import type { AuthUser } from "@/lib/auth/session";
import type { BookingCreateInput } from "@/lib/validation/schemas";
import type { BookingStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";
import { featureEnabled } from "@/lib/env";
import { notifyBookingCreated, notifyBookingStatusChanged } from "@/lib/services/notifications";

const BOOKING_INCLUDE = { tour: true, user: true } as const;

export async function listBookingsForUser(userId: number) {
  return prisma.booking.findMany({
    where: { userId },
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function createBooking(user: AuthUser, input: BookingCreateInput) {
  const tour = await prisma.tour.findFirst({
    where: { id: input.tour, deletedAt: null },
  });
  if (!tour) throw new ApiError(404, "Tour not found.");
  if (!tour.available) {
    throw new ApiError(400, "This tour is currently unavailable.");
  }

  const travelDate = new Date(`${input.travel_date}T00:00:00.000Z`);
  if (Number.isNaN(travelDate.getTime())) {
    throw new ApiError(400, "Enter a valid travel date.");
  }

  // Capacity check: prevent double booking for the same date.
  const booked = await prisma.booking.aggregate({
    where: {
      tourId: tour.id,
      travelDate,
      status: { not: "cancelled" },
    },
    _sum: { travelers: true },
  });
  const alreadyBooked = booked._sum.travelers ?? 0;
  if (alreadyBooked + input.travelers > tour.maxTravelers) {
    throw new ApiError(
      400,
      `Only ${Math.max(0, tour.maxTravelers - alreadyBooked)} place(s) remain for ${input.travel_date}.`,
    );
  }

  const reference = featureEnabled("FEATURE_BOOKING_REFERENCE")
    ? await generateReference(travelDate)
    : null;

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      tourId: tour.id,
      fullName: input.full_name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      travelers: input.travelers,
      travelDate,
      notes: input.notes,
      userLat: input.user_lat,
      userLng: input.user_lng,
      distanceKm: input.distance_km,
      estimatedTimeMins: input.estimated_time_mins,
      googleMapsUrl: input.google_maps_url,
    },
    include: BOOKING_INCLUDE,
  });

  await recordAudit({
    actorId: user.id,
    action: "booking.create",
    entity: "booking",
    entityId: booking.id,
    after: { reference: booking.reference, tourId: booking.tourId, status: booking.status },
  });

  await notifyBookingCreated({
    id: booking.id,
    reference: booking.reference,
    fullName: booking.fullName,
    email: booking.email,
    tourTitle: booking.tour.title,
    travelDate: booking.travelDate,
    travelers: booking.travelers,
    userId: booking.userId,
  });

  return booking;
}

/** Human friendly booking reference, e.g. INF-2026-4821. */
async function generateReference(travelDate: Date): Promise<string> {
  const year = travelDate.getUTCFullYear();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = `INF-${year}-${randomInt(1000, 9999)}`;
    const existing = await prisma.booking.findUnique({ where: { reference } });
    if (!existing) return reference;
  }
  return `INF-${year}-${Date.now().toString().slice(-6)}`;
}

export async function getBooking(id: number) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: BOOKING_INCLUDE });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}

export function assertBookingAccess(booking: { userId: number | null }, user: AuthUser) {
  if (user.isStaff) return;
  if (booking.userId !== user.id) {
    // Do not reveal whether the booking exists.
    throw new ApiError(404, "Booking not found.");
  }
}

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function assertStatusTransition(
  current: BookingStatus,
  next: BookingStatus,
  user: AuthUser,
): void {
  if (next === current) return;
  if (!user.isStaff) {
    if (current === "pending" && next === "cancelled") return;
    throw new ApiError(403, "You are not allowed to change the booking to this status.");
  }
  if (!TRANSITIONS[current].includes(next)) {
    throw new ApiError(400, `Invalid status transition from ${current} to ${next}.`);
  }
}

export async function updateBooking(
  id: number,
  user: AuthUser,
  data: Partial<BookingCreateInput> & { status?: BookingStatus },
) {
  const booking = await getBooking(id);
  assertBookingAccess(booking, user);

  if (!user.isStaff && booking.status !== "pending") {
    throw new ApiError(400, "Only pending bookings can be modified.");
  }

  if (data.status) {
    assertStatusTransition(booking.status, data.status, user);
  }

  const update: Record<string, unknown> = {};
  if (data.full_name !== undefined) update.fullName = data.full_name;
  if (data.email !== undefined) update.email = data.email;
  if (data.phone !== undefined) update.phone = data.phone;
  if (data.address !== undefined) update.address = data.address;
  if (data.travelers !== undefined) update.travelers = data.travelers;
  if (data.travel_date !== undefined) {
    const parsed = new Date(`${data.travel_date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) throw new ApiError(400, "Enter a valid travel date.");
    update.travelDate = parsed;
  }
  if (data.notes !== undefined) update.notes = data.notes;
  if (data.user_lat !== undefined) update.userLat = data.user_lat;
  if (data.user_lng !== undefined) update.userLng = data.user_lng;
  if (data.distance_km !== undefined) update.distanceKm = data.distance_km;
  if (data.estimated_time_mins !== undefined) {
    update.estimatedTimeMins = data.estimated_time_mins;
  }
  if (data.google_maps_url !== undefined) update.googleMapsUrl = data.google_maps_url;
  if (data.status !== undefined) update.status = data.status;

  const updated = await prisma.booking.update({
    where: { id },
    data: update,
    include: BOOKING_INCLUDE,
  });

  if (data.status !== undefined && data.status !== booking.status) {
    await notifyBookingStatusChanged(
      {
        id: updated.id,
        reference: updated.reference,
        fullName: updated.fullName,
        email: updated.email,
        tourTitle: updated.tour.title,
        travelDate: updated.travelDate,
        travelers: updated.travelers,
        userId: updated.userId,
      },
      data.status,
    );
  }

  await recordAudit({
    actorId: user.id,
    action: "booking.update",
    entity: "booking",
    entityId: updated.id,
    before: { status: booking.status },
    after: { status: updated.status },
  });

  return updated;
}

export async function deleteBooking(id: number, user: AuthUser) {
  const booking = await getBooking(id);
  assertBookingAccess(booking, user);
  if (!user.isStaff && booking.status !== "pending") {
    throw new ApiError(400, "Only pending bookings can be deleted.");
  }
  await prisma.booking.delete({ where: { id } });
  await recordAudit({
    actorId: user.id,
    action: "booking.delete",
    entity: "booking",
    entityId: id,
    before: { reference: booking.reference, status: booking.status },
  });
}

export async function listAllBookings(filters: {
  status?: string;
  tour?: number;
  search?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.status && ["pending", "confirmed", "cancelled"].includes(filters.status)) {
    where.status = filters.status;
  }
  if (filters.tour) where.tourId = filters.tour;
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return prisma.booking.findMany({
    where,
    include: BOOKING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export { BOOKING_INCLUDE };
