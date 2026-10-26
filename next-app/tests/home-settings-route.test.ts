import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, PUT } from "@/app/api/home-settings/admin/route";

const {
  requireStaff,
  homeSettingFindUnique,
  homeSettingCreate,
  homeSettingUpdate,
  storeUpload,
  fileFrom,
  validatedImage,
  deleteImage,
  homeSettingSerializer,
} = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  homeSettingFindUnique: vi.fn(),
  homeSettingCreate: vi.fn(),
  homeSettingUpdate: vi.fn(),
  storeUpload: vi.fn(),
  fileFrom: vi.fn(),
  validatedImage: vi.fn(),
  deleteImage: vi.fn(),
  homeSettingSerializer: vi.fn((setting) => setting),
}));

vi.mock("@/lib/auth/session", () => ({ requireStaff }));
vi.mock("@/lib/db/prisma", () => ({
  default: {
    homeSetting: {
      findUnique: homeSettingFindUnique,
      create: homeSettingCreate,
      update: homeSettingUpdate,
    },
  },
}));
vi.mock("@/lib/api/body", () => ({
  fileFrom,
  readPayload: async (request: Request) => {
    const form = await request.formData();
    const payload: Record<string, unknown> = {};
    form.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  },
  storeUpload,
}));
vi.mock("@/lib/storage/images", () => ({ deleteImage, validatedImage }));
vi.mock("@/lib/serializers", () => ({ homeSettingSerializer }));

const originalSetting = {
  id: 1,
  heroImage: "legacy/hero.jpg",
  heroImageData: new Uint8Array([1]),
  heroImageMime: "image/jpeg",
  heroSecondaryImage: null,
  heroSecondaryImageData: null,
  heroSecondaryImageMime: null,
  heroFeatureImage: null,
  heroFeatureImageData: null,
  heroFeatureImageMime: null,
  heroThumbImage: null,
  heroThumbImageData: null,
  heroThumbImageMime: null,
  zanzibarImage: "legacy/zanzibar.jpg",
  tanzaniaImage: null,
  moreExperiencesImage1: "legacy/portfolio.jpg",
  moreExperiencesImage2: null,
  moreExperiencesImage3: null,
  moreExperiencesImage4: null,
  moreExperiencesImage5: null,
  moreExperiencesImageData1: null,
  moreExperiencesImageData2: null,
  moreExperiencesImageData3: null,
  moreExperiencesImageData4: null,
  moreExperiencesImageData5: null,
  moreExperiencesImageMime1: null,
  moreExperiencesImageMime2: null,
  moreExperiencesImageMime3: null,
  moreExperiencesImageMime4: null,
  moreExperiencesImageMime5: null,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createRequest(
  fields: Record<string, string | File>,
  method: "PATCH" | "PUT" = "PATCH",
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return new NextRequest("http://localhost/api/home-settings/admin/", {
    method,
    body: form,
  });
}

describe("PATCH /api/home-settings/admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeSettingFindUnique.mockResolvedValue(originalSetting);
    homeSettingCreate.mockResolvedValue(originalSetting);
    homeSettingUpdate.mockImplementation(async ({ data }) => ({
      ...originalSetting,
      ...data,
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
    }));
    storeUpload.mockImplementation(async (payload, key) =>
      payload[key] ? `home/${key}.jpg` : null,
    );
    fileFrom.mockImplementation((payload, key) => payload[key] ?? null);
    validatedImage.mockResolvedValue({
      buffer: Buffer.from("validated image"),
      mimeType: "image/jpeg",
    });
  });

  it("persists uploaded hero, destination and portfolio images in one update", async () => {
    const response = await PATCH(createRequest({
      hero_image: new File(["hero"], "hero.jpg", { type: "image/jpeg" }),
      zanzibar_image: new File(["island"], "island.jpg", { type: "image/jpeg" }),
      more_experiences_image_1: new File(["trip"], "trip.jpg", { type: "image/jpeg" }),
    }));

    expect(response.status).toBe(200);
    expect(homeSettingUpdate).toHaveBeenCalledOnce();
    expect(homeSettingUpdate.mock.calls[0][0].data).toMatchObject({
      heroImage: null,
      heroImageData: new Uint8Array(Buffer.from("validated image")),
      heroImageMime: "image/jpeg",
      zanzibarImage: "home/zanzibar_image.jpg",
      moreExperiencesImage1: null,
      moreExperiencesImageData1: new Uint8Array(Buffer.from("validated image")),
      moreExperiencesImageMime1: "image/jpeg",
    });
    expect(deleteImage).toHaveBeenCalledWith("legacy/hero.jpg");
    expect(deleteImage).toHaveBeenCalledWith("legacy/zanzibar.jpg");
    expect(deleteImage).toHaveBeenCalledWith("legacy/portfolio.jpg");
  });

  it("clears both stored paths and binary image data when images are removed", async () => {
    const response = await PATCH(createRequest({
      clear_hero_image: "true",
      clear_zanzibar_image: "true",
      clear_more_experiences_image_1: "true",
    }));

    expect(response.status).toBe(200);
    expect(homeSettingUpdate.mock.calls[0][0].data).toMatchObject({
      heroImage: null,
      heroImageData: null,
      heroImageMime: null,
      zanzibarImage: null,
      moreExperiencesImage1: null,
      moreExperiencesImageData1: null,
      moreExperiencesImageMime1: null,
    });
    expect(deleteImage).toHaveBeenCalledWith("legacy/hero.jpg");
    expect(deleteImage).toHaveBeenCalledWith("legacy/zanzibar.jpg");
    expect(deleteImage).toHaveBeenCalledWith("legacy/portfolio.jpg");
  });

  it("accepts PUT uploads through the admin endpoint", async () => {
    const response = await PUT(createRequest({
      hero_thumb_image: new File(["thumb"], "thumb.jpg", { type: "image/jpeg" }),
    }, "PUT"));

    expect(response.status).toBe(200);
    expect(homeSettingUpdate.mock.calls[0][0].data).toMatchObject({
      heroThumbImage: null,
      heroThumbImageMime: "image/jpeg",
    });
  });

  it("keeps existing image files when the settings update fails", async () => {
    homeSettingUpdate.mockRejectedValue(new Error("database unavailable"));
    const response = await PATCH(createRequest({
      zanzibar_image: new File(["new image"], "island.jpg", { type: "image/jpeg" }),
    }));

    expect(response.status).toBe(500);
    expect(deleteImage).toHaveBeenCalledWith("home/zanzibar_image.jpg");
    expect(deleteImage).not.toHaveBeenCalledWith("legacy/zanzibar.jpg");
  });
});
