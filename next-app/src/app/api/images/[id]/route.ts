import { handleApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });

    const image = await prisma.storedImage.findUnique({
      where: { id },
      select: { data: true, mimeType: true },
    });
    if (!image || !ALLOWED_IMAGE_TYPES.has(image.mimeType)) {
      return new Response(null, { status: 404 });
    }

    const bytes = new Uint8Array(image.data);
    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, {
      headers: {
        "Content-Type": image.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
