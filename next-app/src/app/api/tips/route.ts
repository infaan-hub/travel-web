import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { tipSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { tipSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const all = searchParams.get("all") === "true";
    const context = await (async () => {
      try {
        const { optionalAuth } = await import("@/lib/auth/session");
        return await optionalAuth(request);
      } catch {
        return null;
      }
    })();
    const canReadUnpublished = all && context?.user.isStaff === true;
    const where = {
      deletedAt: null,
      ...(canReadUnpublished ? {} : { published: true }),
      ...(category ? { category } : {}),
    };
    const pagination = paginationFrom(searchParams);
    const [tips, total] = await Promise.all([
      prisma.travelTip.findMany({
        where,
        include: { author: true },
        orderBy: { createdAt: "desc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.travelTip.count({ where }),
    ]);
    const data = tips.map(tipSerializer);
    return pagination
      ? paginatedResponse(request, data, total, pagination)
      : listResponse(data, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireStaff(request);
    const payload = await readPayload(request);
    const body = tipSchema.parse(stripFiles(payload));
    const image = await storeUpload(payload, "image", "tips");
    const tip = await prisma.travelTip.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        published: body.published ?? true,
        authorId: user.id,
        image,
      },
      include: { author: true },
    });
    return ok(tipSerializer(tip), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
