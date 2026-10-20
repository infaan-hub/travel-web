import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { userUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { userSerializerWithProfile } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const user = await prisma.user.findUnique({ where: { id }, include: { profile: true } });
    if (!user) throw new ApiError(404, "User not found.");
    return ok(userSerializerWithProfile(user));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const body = userUpdateSchema.parse(await readJson(request));

  const data: Record<string, unknown> = {};
  if (body.username) data.username = body.username;
  if (body.email) data.email = body.email;
  if (body.first_name !== undefined) data.firstName = body.first_name;
  if (body.last_name !== undefined) data.lastName = body.last_name;
  if (body.password) data.password = await hashPassword(body.password);

  const user = await prisma.user.update({ where: { id }, data, include: { profile: true } });
  return ok(userSerializerWithProfile(user));
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
    const staffUser = await requireStaff(request);
    const id = parseId((await context.params).id);
    if (id === staffUser.id) {
      throw new ApiError(400, "You cannot delete your own administrator account.");
    }
    await prisma.user.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
