import { beforeEach, describe, expect, it, vi } from "vitest";
import { companyTourCreateSchema } from "@/lib/validation/company";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  createTour: vi.fn(),
  createItinerary: vi.fn(),
  getCompanyTour: vi.fn(),
  recordAudit: vi.fn(),
  deleteImage: vi.fn(),
  notifyCompanyMembersByRole: vi.fn(),
}));

vi.mock("server-only", () => ({ default: {} }));
vi.mock("@/lib/db/prisma", () => ({
  default: { $transaction: mocks.transaction },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: mocks.recordAudit }));
vi.mock("@/lib/services/company-workspace", () => ({
  getCompanyTour: mocks.getCompanyTour,
}));
vi.mock("@/lib/services/notifications", () => ({
  notifyCompanyMembersByRole: mocks.notifyCompanyMembersByRole,
}));
vi.mock("@/lib/storage/images", () => ({ deleteImage: mocks.deleteImage }));

import { createCompanyTour } from "@/lib/services/company-tours";

describe("company tour persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const transaction = {
      tour: { create: mocks.createTour },
      itineraryItem: { createMany: mocks.createItinerary },
    };
    mocks.transaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
    mocks.createTour.mockResolvedValue({ id: 51, title: "Stone Town walk" });
    mocks.getCompanyTour.mockResolvedValue({ id: 51, title: "Stone Town walk" });
    mocks.recordAudit.mockResolvedValue(undefined);
  });

  it("persists validated tour fields, company ownership, images and itinerary", async () => {
    const input = companyTourCreateSchema.parse({
      title: " Stone Town walk ",
      short_description: "A guided walk",
      description: "Explore the historic streets.",
      price: "45.50",
      duration: "3 hours",
      destination: "Stone Town",
      category: "zanzibar",
      max_travelers: "12",
      publication_status: "DRAFT",
      available: "true",
      destination_lat: "-6.1659",
      destination_lng: "39.2026",
      includes: JSON.stringify(["Local guide"]),
      excludes: JSON.stringify(["Meals"]),
      itinerary: JSON.stringify([
        { day: "1", title: "Old town", description: "Visit the historic center." },
      ]),
    });

    const tour = await createCompanyTour(
      8,
      { id: 17, ipAddress: "127.0.0.1" },
      input,
      {
        image: "tours/cover.jpg",
        image2: "tours/second.jpg",
      },
    );

    expect(tour).toEqual({ id: 51, title: "Stone Town walk" });
    expect(mocks.createTour).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Stone Town walk",
        shortDescription: "A guided walk",
        description: "Explore the historic streets.",
        price: 45.5,
        duration: "3 hours",
        destination: "Stone Town",
        destinationLat: -6.1659,
        destinationLng: 39.2026,
        category: "zanzibar",
        includes: ["Local guide"],
        excludes: ["Meals"],
        available: true,
        maxTravelers: 12,
        companyId: 8,
        publicationStatus: "DRAFT",
        image: "tours/cover.jpg",
        image2: "tours/second.jpg",
        image3: null,
        featured: false,
        publishedAt: null,
        publishedByUserId: null,
      }),
    });
    expect(mocks.createItinerary).toHaveBeenCalledWith({
      data: [
        {
          tourId: 51,
          day: 1,
          title: "Old town",
          description: "Visit the historic center.",
        },
      ],
    });
    expect(mocks.getCompanyTour).toHaveBeenCalledWith(8, 51);
    expect(mocks.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 17,
        companyId: 8,
        action: "company.tour.create",
        entityId: 51,
      }),
    );
  });
});