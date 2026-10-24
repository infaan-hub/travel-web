import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/admin/companies/[id]/route";

const {
  prismaTransaction,
  transaction,
  requireStaff,
  deleteImage,
} = vi.hoisted(() => {
  const transaction = {
    company: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    booking: { deleteMany: vi.fn() },
    visitorTracking: { deleteMany: vi.fn() },
    funnelEvent: { deleteMany: vi.fn() },
    auditLog: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    tour: { deleteMany: vi.fn() },
  };

  return {
    transaction,
    prismaTransaction: vi.fn(),
    requireStaff: vi.fn(),
    deleteImage: vi.fn(),
  };
});

vi.mock("@/lib/db/prisma", () => ({
  default: { $transaction: prismaTransaction },
}));

vi.mock("@/lib/auth/session", () => ({ requireStaff }));
vi.mock("@/lib/storage/images", () => ({ deleteImage }));
vi.mock("@/lib/services/companies", () => ({
  getAdminCompany: vi.fn(),
  updateAdminCompany: vi.fn(),
}));

describe("DELETE /api/admin/companies/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaTransaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
    transaction.company.findUnique.mockResolvedValue({
      id: 31,
      logoImageKey: "companies/logo.png",
      coverImageKey: null,
      memberships: [{ id: 7 }],
      tours: [
        {
          id: 12,
          image: "tours/cover.png",
          image2: null,
          image3: "tours/third.png",
          galleryImages: [{ image: "tours/gallery.png" }],
        },
      ],
      trips: [{ image: "companies/trips/day-trip.png" }],
    });
  });

  it("permanently removes associated records and stored images", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/companies/31", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "31" }) },
    );

    expect(response.status).toBe(204);
    expect(transaction.booking.deleteMany).toHaveBeenCalledWith({
      where: { OR: [{ companyId: 31 }, { tourId: { in: [12] } }] },
    });
    expect(transaction.tour.deleteMany).toHaveBeenCalledWith({
      where: { companyId: 31 },
    });
    expect(transaction.notification.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { companyId: 31 },
          { tag: { in: ["company-membership-7"] } },
        ],
      },
    });
    expect(transaction.company.delete).toHaveBeenCalledWith({
      where: { id: 31 },
    });
    expect(deleteImage).toHaveBeenCalledTimes(5);
  });

  it("does not start deletion when the request is unauthorized", async () => {
    requireStaff.mockRejectedValueOnce(new Error("Unauthorized"));

    const response = await DELETE(
      new NextRequest("http://localhost/api/admin/companies/31", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "31" }) },
    );

    expect(response.status).not.toBe(204);
    expect(prismaTransaction).not.toHaveBeenCalled();
  });
});
