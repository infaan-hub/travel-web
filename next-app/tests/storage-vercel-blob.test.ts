import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createImage, deleteBlob, putBlob } = vi.hoisted(() => ({
  createImage: vi.fn(),
  deleteBlob: vi.fn(),
  putBlob: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    storedImage: {
      create: createImage,
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  del: deleteBlob,
  put: putBlob,
}));

import { deleteImage, saveImage } from "@/lib/storage/images";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const environmentKeys = [
  "VERCEL",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL_OIDC_TOKEN",
] as const;

const previousEnvironment = new Map<string, string | undefined>();

beforeEach(() => {
  previousEnvironment.clear();
  for (const key of environmentKeys) {
    previousEnvironment.set(key, process.env[key]);
    delete process.env[key];
  }
  vi.clearAllMocks();
});

afterEach(() => {
  for (const key of environmentKeys) {
    const value = previousEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Vercel Blob image storage", () => {
  it("stores images in Blob and deletes their URLs", async () => {
    const url = "https://store.public.blob.vercel-storage.com/companies/logo.png";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    putBlob.mockResolvedValue({ url });

    const file = new File([PNG], "logo.png", { type: "image/png" });
    await expect(saveImage(file, "tours")).resolves.toBe(url);
    expect(putBlob).toHaveBeenCalledWith(
      expect.stringMatching(/^tours\/[0-9a-f-]+\.png$/),
      expect.any(Buffer),
      {
        access: "public",
        addRandomSuffix: false,
        contentType: "image/png",
      },
    );

    await deleteImage(url);
    expect(deleteBlob).toHaveBeenCalledWith(url);
  });

  it("uses the connected Vercel Blob store credentials", async () => {
    process.env.BLOB_STORE_ID = "store_test";
    process.env.VERCEL_OIDC_TOKEN = "test-oidc-token";
    putBlob.mockResolvedValue({
      url: "https://store.public.blob.vercel-storage.com/companies/logo.png",
    });

    const file = new File([PNG], "logo.png", { type: "image/png" });
    await expect(saveImage(file, "tours")).resolves.toContain(".blob.vercel-storage.com/");
    expect(putBlob).toHaveBeenCalled();
  });

  it("stores tour images in PostgreSQL when Vercel Blob is not configured", async () => {
    process.env.VERCEL = "1";
    createImage.mockResolvedValue({
      id: "123e4567-e89b-42d3-a456-426614174000",
    });
    const file = new File([PNG], "logo.png", { type: "image/png" });

    await expect(saveImage(file, "tours")).resolves.toBe(
      "db/123e4567-e89b-42d3-a456-426614174000",
    );
    expect(createImage).toHaveBeenCalledWith({
      data: { data: expect.any(Uint8Array), mimeType: "image/png" },
      select: { id: true },
    });
    expect(putBlob).not.toHaveBeenCalled();
  });
});
