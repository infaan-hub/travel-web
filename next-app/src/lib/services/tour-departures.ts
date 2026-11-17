import "server-only";

import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import prisma from "@/lib/db/prisma";

type Actor = {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function assertCompanyTour(companyId: number, tourId: number) {
  const tour = await prisma.tour.findFirst({
    where: { id: tourId, companyId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!tour) throw new ApiError(404, "Tour not found.");
  return tour;
}

export async function listCompanyDepartures(companyId: number, tourId: number) {
  await assertCompanyTour(companyId, tourId);
  return prisma.tourDeparture.findMany({
    where: { tourId },
    orderBy: { date: "asc" },
  });
}

export async function createCompanyDeparture(
  companyId: number,
  tourId: number,
  actor: Actor,
  input: { date: string; capacity: number; price?: number | null; status?: string },
) {
  await assertCompanyTour(companyId, tourId);
  const date = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "Enter a valid departure date.");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) {
    throw new ApiError(400, "Capacity must be a positive integer.");
  }

  const departure = await prisma.tourDeparture.create({
    data: {
      tourId,
      date,
      capacity: input.capacity,
      price: input.price ?? null,
      status: input.status ?? "scheduled",
    },
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.departure.create",
    entity: "tour_departure",
    entityId: departure.id,
    after: { tourId, date: departure.date, capacity: departure.capacity },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return departure;
}

export async function updateCompanyDeparture(
  companyId: number,
  tourId: number,
  departureId: number,
  actor: Actor,
  input: { date?: string; capacity?: number; price?: number | null; status?: string },
) {
  await assertCompanyTour(companyId, tourId);
  const existing = await prisma.tourDeparture.findFirst({
    where: { id: departureId, tourId },
  });
  if (!existing) throw new ApiError(404, "Departure not found.");

  const data: Prisma.TourDepartureUpdateInput = {};
  if (input.date !== undefined) {
    const date = new Date(`${input.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, "Enter a valid departure date.");
    data.date = date;
  }
  if (input.capacity !== undefined) {
    if (!Number.isInteger(input.capacity) || input.capacity < 1) {
      throw new ApiError(400, "Capacity must be a positive integer.");
    }
    if (input.capacity < existing.bookedCount) {
      throw new ApiError(400, "Capacity cannot be less than already booked travelers.");
    }
    data.capacity = input.capacity;
  }
  if (input.price !== undefined) data.price = input.price;
  if (input.status !== undefined) data.status = input.status;

  const departure = await prisma.tourDeparture.update({
    where: { id: departureId },
    data,
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.departure.update",
    entity: "tour_departure",
    entityId: departure.id,
    before: { capacity: existing.capacity, status: existing.status },
    after: { capacity: departure.capacity, status: departure.status },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  return departure;
}

export async function deleteCompanyDeparture(
  companyId: number,
  tourId: number,
  departureId: number,
  actor: Actor,
) {
  await assertCompanyTour(companyId, tourId);
  const existing = await prisma.tourDeparture.findFirst({
    where: { id: departureId, tourId },
  });
  if (!existing) throw new ApiError(404, "Departure not found.");
  if (existing.bookedCount > 0) {
    throw new ApiError(400, "Cannot delete a departure with existing bookings.");
  }
  await prisma.tourDeparture.delete({ where: { id: departureId } });
  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.tour.departure.delete",
    entity: "tour_departure",
    entityId: departureId,
    before: { date: existing.date, capacity: existing.capacity },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
}

export async function listPublicDepartures(tourId: number, from?: string, to?: string) {
  const where: Prisma.TourDepartureWhereInput = {
    tourId,
    status: "scheduled",
  };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(`${from}T00:00:00.000Z`);
    if (to) where.date.lte = new Date(`${to}T00:00:00.000Z`);
  }
  return prisma.tourDeparture.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      date: true,
      capacity: true,
      bookedCount: true,
      price: true,
      status: true,
    },
  });
}