import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/company/tours/[id]/gallery/route";

const { transaction, transactionCall, requireCompanyMember, tourFindFirst, storeUpload, deleteImage } =
  vi.hoisted(() => {
    const transaction = {
      tourGalleryImage: {
        count: vi.fn(),
        create: vi.fn(),
      },
    };
    return {
      transaction,
      transactionCall: vi.fn(),
      requireCompanyMember: vi.fn(),
      tourFindFirst: vi.fn(),
      storeUpload: vi.fn(),
      deleteImage: vi.fn(),
    };
  });

vi.mock("@/lib/db/prisma", () => ({
  default: {
    tour: { findFirst: tourFindFirst },
    $transaction: transactionCall,
  },
}));
vi.mock("@/lib/auth/company", () => ({ requireCompanyMember }));
vi.mock("@/lib/api/body", () => ({
  readPayload: vi.fn(async () => ({ order: "5" })),
  storeUpload,
}));
vi.mock("@/lib/storage/images", () => ({ deleteImage }));

describe("company tour gallery capacity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCompanyMember.mockResolvedValue({
      company: { id: 10 },
      user: { id: 4 },
    });
    tourFindFirst.mockResolvedValue({ id: 7 });
    storeUpload.mockResolvedValue("tours/gallery/new.png");
    transactionCall.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it("rejects a sixth gallery image and removes its uploaded file", async () => {
    transaction.tourGalleryImage.count.mockResolvedValue(5);

    const response = await POST(
      new NextRequest("http://localhost/api/company/tours/7/gallery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: 5 }),
      }),
      { params: Promise.resolve({ id: "7" }) },
    );

    expect(response.status).toBe(400);
    expect(transaction.tourGalleryImage.create).not.toHaveBeenCalled();
    expect(deleteImage).toHaveBeenCalledWith("tours/gallery/new.png");
  });
});
