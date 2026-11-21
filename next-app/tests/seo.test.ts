import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  DEFAULT_OG_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_TITLE,
  SITE_NAME,
  resolveMetadataBase,
} from "@/lib/seo";

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

describe("Open Graph & social share metadata", () => {
  it("ships a valid 1200x630 JPEG og-image under 300 KB for WhatsApp and social crawlers", async () => {
    const filePath = path.join(PUBLIC_DIR, DEFAULT_OG_IMAGE.url.replace(/^\//, ""));
    expect(existsSync(filePath)).toBe(true);

    const stats = statSync(filePath);
    expect(stats.size).toBeGreaterThan(10_000);
    expect(stats.size).toBeLessThan(300_000);

    const meta = await sharp(filePath).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });

  it("defines non-empty brand name, Open Graph title, description, and image dimensions", () => {
    expect(SITE_NAME).toBe("Travel.");
    expect(DEFAULT_OG_TITLE.length).toBeGreaterThan(10);
    expect(DEFAULT_OG_DESCRIPTION.length).toBeGreaterThan(40);
    expect(DEFAULT_OG_IMAGE.width).toBe(1200);
    expect(DEFAULT_OG_IMAGE.height).toBe(630);
    expect(DEFAULT_OG_IMAGE.type).toBe("image/jpeg");
  });

  it("resolves metadataBase cleanly across APP_URL, Vercel production/preview URLs, and fallback", () => {
    expect(resolveMetadataBase({ APP_URL: "https://travel.example.com" }).origin).toBe(
      "https://travel.example.com",
    );
    expect(
      resolveMetadataBase({ VERCEL_PROJECT_PRODUCTION_URL: "travel-web.vercel.app" }).origin,
    ).toBe("https://travel-web.vercel.app");
    expect(resolveMetadataBase({ VERCEL_URL: "preview-123.vercel.app" }).origin).toBe(
      "https://preview-123.vercel.app",
    );
    expect(resolveMetadataBase({}).origin).toBe("http://localhost:3000");
  });
});
