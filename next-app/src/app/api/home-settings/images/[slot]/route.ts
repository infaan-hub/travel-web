import prisma from "@/lib/db/prisma";
import { readStoredImage } from "@/lib/storage/images";

export const dynamic = "force-dynamic";

const portfolioImageFields = [
  ["moreExperiencesImageData1", "moreExperiencesImageMime1", "moreExperiencesImage1"],
  ["moreExperiencesImageData2", "moreExperiencesImageMime2", "moreExperiencesImage2"],
  ["moreExperiencesImageData3", "moreExperiencesImageMime3", "moreExperiencesImage3"],
  ["moreExperiencesImageData4", "moreExperiencesImageMime4", "moreExperiencesImage4"],
  ["moreExperiencesImageData5", "moreExperiencesImageMime5", "moreExperiencesImage5"],
] as const;

const heroImageFields = {
  hero: ["heroImageData", "heroImageMime", "heroImage"] as const,
  secondary: ["heroSecondaryImageData", "heroSecondaryImageMime", "heroSecondaryImage"] as const,
  feature: ["heroFeatureImageData", "heroFeatureImageMime", "heroFeatureImage"] as const,
  thumb: ["heroThumbImageData", "heroThumbImageMime", "heroThumbImage"] as const,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slot: string }> },
) {
  const { slot } = await params;
  const field = Object.hasOwn(heroImageFields, slot)
    ? heroImageFields[slot as keyof typeof heroImageFields]
    : /^\d+$/.test(slot) ? portfolioImageFields[Number(slot) - 1] : undefined;
  if (!field) return new Response(null, { status: 404 });

  try {
    const setting = await prisma.homeSetting.findUnique({ where: { id: 1 } });
    if (!setting) return new Response(null, { status: 404 });

    const [dataField, mimeField, pathField] = field;
    const storedData = setting[dataField];
    const mimeType = setting[mimeField];
    let bytes: Uint8Array | null = storedData ? new Uint8Array(storedData) : null;
    let contentType = mimeType || "";

    if (!bytes && setting[pathField]) {
      const legacyImage = await readStoredImage(setting[pathField]);
      if (legacyImage) {
        bytes = legacyImage.buffer;
        contentType = legacyImage.mimeType;
      }
    }

    if (!bytes || !/^image\/(jpeg|png|webp)$/.test(contentType)) {
      return new Response(null, { status: 404 });
    }

    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
