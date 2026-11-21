import { afterEach, describe, expect, it } from "vitest";
import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { deleteImage, saveImage, validatedImage } from "@/lib/storage/images";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const saved: string[] = [];

afterEach(async () => {
  for (const key of saved.splice(0)) {
    await deleteImage(key);
  }
});

describe("image storage", () => {
  it("validates bytes and stores allowed images under a generated key", async () => {
    const file = new File([PNG], "pixel.png", { type: "image/png" });
    const key = await saveImage(file, "tours");
    saved.push(key);
    expect(key).toMatch(/^tours\/[0-9a-f-]+\.png$/);
    await expect(access(path.join(process.cwd(), "public", "uploads", key))).resolves.toBeUndefined();
  });

  it("rejects non-image content even if the browser claims an image type", async () => {
    const file = new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" });
    await expect(saveImage(file, "tours")).rejects.toThrow(/Invalid image type/);
  });

  it("rejects oversized files", async () => {
    const file = new File([Buffer.alloc(5 * 1024 * 1024 + 1)], "large.png", {
      type: "image/png",
    });
    await expect(saveImage(file, "tours")).rejects.toThrow(/too large/);
  });

  it("resizes and compresses large uploaded photos while preserving format", async () => {
    const largeJpeg = await sharp({
      create: {
        width: 2400,
        height: 1600,
        channels: 3,
        background: { r: 20, g: 110, b: 170 },
      },
    })
      .jpeg({ quality: 100 })
      .toBuffer();

    const file = new File([new Uint8Array(largeJpeg)], "photo.jpg", { type: "image/jpeg" });
    const result = await validatedImage(file);
    const meta = await sharp(result.buffer).metadata();

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.extension).toBe("jpg");
    expect(meta.width).toBeLessThanOrEqual(1920);
    expect(meta.height).toBeLessThanOrEqual(1920);
    expect(result.buffer.length).toBeLessThan(largeJpeg.length);
  });
});
