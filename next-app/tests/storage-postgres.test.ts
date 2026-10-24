import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createImage, deleteImages, findImage } = vi.hoisted(() => ({
  createImage: vi.fn(),
  deleteImages: vi.fn(),
  findImage: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    storedImage: {
      create: createImage,
      deleteMany: deleteImages,
      findUnique: findImage,
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
  put: vi.fn(),
}));

import { GET } from "@/app/api/images/[id]/route";
import {
  deleteImage,
  publicImageUrl,
  saveImage,
} from "@/lib/storage/images";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const IMAGE_ID = "123e4567-e89b-42d3-a456-426614174000";
const ENV_KEYS = [
  "VERCEL",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL_OIDC_TOKEN",
] as const;
const previousEnvironment = new Map<string, string | undefined>();

beforeEach(() => {
  vi.clearAllMocks();
  previousEnvironment.clear();
  for (const key of ENV_KEYS) {
    previousEnvironment.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = previousEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("PostgreSQL company image storage", () => {
  it("stores company uploads in PostgreSQL without Blob credentials", async () => {
    process.env.VERCEL = "1";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL_OIDC_TOKEN;
    createImage.mockResolvedValue({ id: IMAGE_ID });

    const file = new File([PNG], "logo.png", { type: "image/png" });
    await expect(saveImage(file, "companies")).resolves.toBe(`db/${IMAGE_ID}`);
    expect(createImage).toHaveBeenCalledWith({
      data: { data: expect.any(Uint8Array), mimeType: "image/png" },
      select: { id: true },
    });
    expect(publicImageUrl(`db/${IMAGE_ID}`)).toBe(`/api/images/${IMAGE_ID}`);
  });

  it("serves stored images with their verified content type", async () => {
    findImage.mockResolvedValue({ data: PNG, mimeType: "image/png" });

    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ id: IMAGE_ID }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PNG);
    expect(findImage).toHaveBeenCalledWith({
      where: { id: IMAGE_ID },
      select: { data: true, mimeType: true },
    });
  });

  it("rejects malformed image IDs without querying the database", async () => {
    const response = await GET(new Request("https://example.com"), {
      params: Promise.resolve({ id: "../../other" }),
    });

    expect(response.status).toBe(404);
    expect(findImage).not.toHaveBeenCalled();
  });

  it("deletes replaced database images", async () => {
    deleteImages.mockResolvedValue({ count: 1 });

    await deleteImage(`db/${IMAGE_ID}`);

    expect(deleteImages).toHaveBeenCalledWith({ where: { id: IMAGE_ID } });
  });
});
