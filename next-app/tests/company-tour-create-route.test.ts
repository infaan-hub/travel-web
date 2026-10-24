import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  requireCompanyMember: vi.fn(),
  requestAuditActor: vi.fn(),
  storeUpload: vi.fn(),
  deleteImage: vi.fn(),
  createCompanyTour: vi.fn(),
}));

vi.mock("@/lib/auth/company", () => ({
  requireCompanyMember: mocks.requireCompanyMember,
}));
vi.mock("@/lib/api/request-context", () => ({
  requestAuditActor: mocks.requestAuditActor,
}));
vi.mock("@/lib/api/body", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/body")>();
  return { ...actual, storeUpload: mocks.storeUpload };
});
vi.mock("@/lib/storage/images", () => ({
  deleteImage: mocks.deleteImage,
  publicImageUrl: (key: string | null) => (key ? `/uploads/${key}` : null),
}));
vi.mock("@/lib/services/company-tours", () => ({
  createCompanyTour: mocks.createCompanyTour,
}));
vi.mock("@/lib/services/company-workspace", () => ({
  listCompanyTours: vi.fn(),
}));

import { POST } from "@/app/api/company/tours/route";

describe("POST /api/company/tours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCompanyMember.mockResolvedValue({
      company: { id: 8 },
      user: { id: 17 },
    });
    mocks.requestAuditActor.mockReturnValue({ id: 17 });
    mocks.storeUpload.mockImplementation(async (_payload, field: string) =>
      field === "image" ? "tours/cover.jpg" : null,
    );
    mocks.deleteImage.mockResolvedValue(undefined);
    mocks.createCompanyTour.mockResolvedValue({
      id: 51,
      title: "Stone Town walk",
      description: "Explore the historic streets.",
      shortDescription: "A guided walk",
      price: { toString: () => "45.50" },
      duration: "3 hours",
      destination: "Stone Town",
      destinationLat: -6.1659,
      destinationLng: 39.2026,
      category: "zanzibar",
      image: "tours/cover.jpg",
      image2: null,
      image3: null,
      includes: ["Local guide"],
      excludes: ["Meals"],
      available: true,
      featured: false,
      companyId: 8,
      publicationStatus: "DRAFT",
      publishedAt: null,
      maxTravelers: 12,
      moderationNote: null,
      createdAt: new Date("2026-10-24T10:00:00.000Z"),
      updatedAt: new Date("2026-10-24T10:00:00.000Z"),
      itinerary: [
        {
          id: 91,
          tourId: 51,
          day: 1,
          title: "Old town",
          description: "Visit the historic center.",
        },
      ],
      galleryImages: [],
      reviews: [],
      company: { name: "Island Tours", slug: "island-tours" },
      _count: { bookings: 0 },
    });
  });

  it("parses multipart form data, creates the company tour and serializes its response", async () => {
    const form = new FormData();
    form.set("title", "Stone Town walk");
    form.set("short_description", "A guided walk");
    form.set("description", "Explore the historic streets.");
    form.set("price", "45.50");
    form.set("duration", "3 hours");
    form.set("destination", "Stone Town");
    form.set("category", "zanzibar");
    form.set("max_travelers", "12");
    form.set("publication_status", "DRAFT");
    form.set("available", "true");
    form.set("destination_lat", "-6.1659");
    form.set("destination_lng", "39.2026");
    form.set("includes", JSON.stringify(["Local guide"]));
    form.set("excludes", JSON.stringify(["Meals"]));
    form.set(
      "itinerary",
      JSON.stringify([
        { day: 1, title: "Old town", description: "Visit the historic center." },
      ]),
    );
    form.set("image", new File(["cover"], "cover.jpg", { type: "image/jpeg" }));
    const request = new NextRequest("http://localhost/api/company/tours", {
      method: "POST",
      body: form,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.requireCompanyMember).toHaveBeenCalledWith(request, {
      permission: "tours:write",
    });
    expect(mocks.createCompanyTour).toHaveBeenCalledWith(
      8,
      { id: 17 },
      expect.objectContaining({
        title: "Stone Town walk",
        price: 45.5,
        max_travelers: 12,
        includes: ["Local guide"],
        excludes: ["Meals"],
        itinerary: [
          {
            day: 1,
            title: "Old town",
            description: "Visit the historic center.",
          },
        ],
      }),
      {
        image: "tours/cover.jpg",
      },
    );
    expect(body).toMatchObject({
      id: 51,
      title: "Stone Town walk",
      company_id: 8,
      publication_status: "DRAFT",
      max_travelers: 12,
      main_image_url: "/uploads/tours/cover.jpg",
      included_items: ["Local guide"],
      excluded_items: ["Meals"],
      itinerary: [
        {
          id: 91,
          day: 1,
          title: "Old town",
          description: "Visit the historic center.",
        },
      ],
    });
  });
});