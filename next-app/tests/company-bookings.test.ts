import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  transaction: vi.fn(),
  txFindFirst: vi.fn(),
  updateMany: vi.fn(),
  recordAudit: vi.fn(),
  recordFunnelEvent: vi.fn(),
  notifyBookingStatusChanged: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    booking: { findFirst: mocks.findFirst },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAudit: mocks.recordAudit,
}));

vi.mock("@/lib/services/funnel", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
}));

vi.mock("@/lib/services/notifications", () => ({
  notifyBookingStatusChanged: mocks.notifyBookingStatusChanged,
}));

vi.mock("@/lib/logging", () => ({
  logger: { error: mocks.loggerError },
}));

import { updateCompanyBookingStatus } from "@/lib/services/company-bookings";

function booking(status: "pending" | "confirmed" | "cancelled") {
  return {
    id: 42,
    reference: "INF-PHASE6",
    companyId: 7,
    userId: 11,
    status,
    fullName: "Phase Six Guest",
    email: "guest@example.com",
    tourTitleSnapshot: "Phase Six Tour",
    tour: { title: "Phase Six Tour" },
    travelDate: new Date("2029-03-03T00:00:00.000Z"),
    travelers: 2,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recordAudit.mockResolvedValue(undefined);
  mocks.recordFunnelEvent.mockResolvedValue(undefined);
  mocks.notifyBookingStatusChanged.mockResolvedValue(undefined);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      booking: {
        findFirst: mocks.txFindFirst,
        updateMany: mocks.updateMany,
      },
    }),
  );
});

describe("company booking status updates", () => {
  it("keeps the confirmed booking when notification delivery fails", async () => {
    const pending = booking("pending");
    const confirmed = booking("confirmed");
    mocks.findFirst.mockResolvedValueOnce(pending);
    mocks.txFindFirst
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(confirmed);
    mocks.updateMany.mockResolvedValueOnce({ count: 1 });
    mocks.notifyBookingStatusChanged.mockRejectedValueOnce(
      new Error("push service unavailable"),
    );

    const updated = await updateCompanyBookingStatus(7, 42, "confirmed", {
      id: 99,
    });

    expect(updated.status).toBe("confirmed");
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 7,
        actorId: 99,
        action: "company.booking.status",
        entity: "booking",
        entityId: 42,
        before: { status: "pending" },
        after: { status: "confirmed" },
      }),
    );
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "booking_confirmed",
      expect.objectContaining({ bookingId: 42 }),
    );
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "failed to notify about a company booking status change",
      expect.objectContaining({ bookingId: 42, status: "confirmed" }),
    );
  });

  it("returns 409 when another writer changed the expected status", async () => {
    const pending = booking("pending");
    mocks.findFirst.mockResolvedValueOnce(pending);
    mocks.txFindFirst.mockResolvedValueOnce(pending);
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      updateCompanyBookingStatus(7, 42, "cancelled", { id: 99 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.recordAudit).not.toHaveBeenCalled();
    expect(mocks.notifyBookingStatusChanged).not.toHaveBeenCalled();
  });

  it("is idempotent for the same status without writing or notifying", async () => {
    const confirmed = booking("confirmed");
    mocks.findFirst.mockResolvedValueOnce(confirmed);

    const result = await updateCompanyBookingStatus(7, 42, "confirmed", {
      id: 99,
    });

    expect(result).toBe(confirmed);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.recordAudit).not.toHaveBeenCalled();
    expect(mocks.notifyBookingStatusChanged).not.toHaveBeenCalled();
  });
});
