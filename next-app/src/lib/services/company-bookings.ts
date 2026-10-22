import "server-only";
import type { BookingStatus } from "@prisma/client";
import { ApiError } from "@/lib/api/http";
import { recordAudit } from "@/lib/audit";
import { isCompanyBookingTransitionAllowed } from "@/lib/company-operations";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logging";
import { recordFunnelEvent } from "@/lib/services/funnel";
import { notifyBookingStatusChanged } from "@/lib/services/notifications";

const COMPANY_BOOKING_INCLUDE = {
  tour: true,
  user: true,
  company: true,
} as const;

type BookingActor = {
  id: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Company-scoped status transition. The conditional update makes two
 * simultaneous confirmations/cancellations deterministic: only the request
 * that still sees the expected current status can change the row.
 */
export async function updateCompanyBookingStatus(
  companyId: number,
  bookingId: number,
  nextStatus: BookingStatus,
  actor: BookingActor,
) {
  const before = await prisma.booking.findFirst({
    where: { id: bookingId, companyId },
    include: COMPANY_BOOKING_INCLUDE,
  });
  if (!before) throw new ApiError(404, "Booking not found.");
  if (!isCompanyBookingTransitionAllowed(before.status, nextStatus)) {
    throw new ApiError(
      400,
      `A ${before.status} booking cannot be changed to ${nextStatus}.`,
    );
  }
  if (before.status === nextStatus) return before;

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.booking.findFirst({
      where: { id: bookingId, companyId },
      include: COMPANY_BOOKING_INCLUDE,
    });
    if (!current) throw new ApiError(404, "Booking not found.");
    if (!isCompanyBookingTransitionAllowed(current.status, nextStatus)) {
      throw new ApiError(
        400,
        `A ${current.status} booking cannot be changed to ${nextStatus}.`,
      );
    }

    const result = await tx.booking.updateMany({
      where: { id: bookingId, companyId, status: current.status },
      data: { status: nextStatus },
    });
    if (result.count !== 1) {
      throw new ApiError(
        409,
        "This booking was updated by someone else. Refresh and try again.",
      );
    }

    const changed = await tx.booking.findFirst({
      where: { id: bookingId, companyId },
      include: COMPANY_BOOKING_INCLUDE,
    });
    if (!changed) throw new ApiError(404, "Booking not found.");
    return changed;
  });

  await recordAudit({
    actorId: actor.id,
    companyId,
    action: "company.booking.status",
    entity: "booking",
    entityId: bookingId,
    before: { status: before.status },
    after: { status: updated.status },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });

  await recordFunnelEvent(
    updated.status === "confirmed" ? "booking_confirmed" : "booking_cancelled",
    {
      tourId: updated.tourId,
      bookingId: updated.id,
      metadata: { reference: updated.reference, company_id: companyId },
    },
  );

  try {
    await notifyBookingStatusChanged(
      {
        id: updated.id,
        reference: updated.reference,
        fullName: updated.fullName,
        email: updated.email,
        tourTitle: updated.tourTitleSnapshot ?? updated.tour.title,
        travelDate: updated.travelDate,
        travelers: updated.travelers,
        userId: updated.userId,
        companyId: updated.companyId,
      },
      updated.status,
    );
  } catch (error) {
    logger.error("failed to notify about a company booking status change", {
      bookingId: updated.id,
      status: updated.status,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return updated;
}
