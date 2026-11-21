import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requirePrivateHireDriver } from "@/lib/auth/private-hire-driver";
import prisma from "@/lib/db/prisma";
import { expireOverdueTripRequests } from "@/lib/services/booking-expiration";

export async function GET(request: NextRequest) {
  try {
    const { driver } = await requirePrivateHireDriver(request);
    if (!driver.isPublic || driver.companyId !== null) return ok({ results: [] });
    await expireOverdueTripRequests();
    const [requests, assignedRequests] = await Promise.all([prisma.transportTripRequest.findMany({
      where: { driverId: null, status: "requested", bookings: { none: {} } },
      select: { id: true, origin: true, destination: true, travelDate: true, pickupTime: true, passengers: true, luggage: true, notes: true, status: true },
      orderBy: [{ travelDate: "asc" }, { createdAt: "asc" }],
      take: 50,
    }), prisma.transportTripRequest.findMany({
      where: { driverId: driver.id, status: "accepted" },
      orderBy: [{ travelDate: "asc" }, { updatedAt: "desc" }],
      take: 50,
    })]);
    return ok({ results: requests, assigned: assignedRequests });
  } catch (error) {
    return handleApiError(error);
  }
}
