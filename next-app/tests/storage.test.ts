import { afterEach, describe, expect, it } from "vitest";
import { access, rm } from "node:fs/promises";
import path from "node:path";
import { deleteImage, saveImage } from "@/lib/storage/images";

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
});
