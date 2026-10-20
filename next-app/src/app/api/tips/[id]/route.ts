import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { tipUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { tipSerializer } from "@/lib/serializers";
import { deleteImage } from "@/lib/storage/images";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const id = parseId((await context.params).id);
    const tip = await prisma.travelTip.findUnique({ where: { id }, include: { author: true } });
    if (!tip || !tip.published) throw new ApiError(404, "Travel tip not found.");
    return ok(tipSerializer(tip));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const existing = await prisma.travelTip.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Travel tip not found.");
  const payload = await readPayload(request);
  const body = tipUpdateSchema.parse(stripFiles(payload));
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.content !== undefined) data.content = body.content;
  if (body.category !== undefined) data.category = body.category;
  if (body.published !== undefined) data.published = body.published;
  const image = await storeUpload(payload, "image", "tips");
  if (image) {
    data.image = image;
    await deleteImage(existing.image);
  }
  const tip = await prisma.travelTip.update({ where: { id }, data, include: { author: true } });
  return ok(tipSerializer(tip));
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const tip = await prisma.travelTip.findUnique({ where: { id } });
    if (!tip) throw new ApiError(404, "Travel tip not found.");
    await prisma.travelTip.update({
      where: { id },
      data: { deletedAt: new Date(), published: false },
    });
    await deleteImage(tip.image);
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
