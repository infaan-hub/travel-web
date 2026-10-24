import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { deleteBlob, putBlob } = vi.hoisted(() => ({
  deleteBlob: vi.fn(),
  putBlob: vi.fn(),
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

  it("returns a clear configuration error instead of writing to Vercel's filesystem", async () => {
    process.env.VERCEL = "1";
    const file = new File([PNG], "logo.png", { type: "image/png" });

    await expect(saveImage(file, "tours")).rejects.toMatchObject({
      status: 503,
    });
    expect(putBlob).not.toHaveBeenCalled();
  });
});
