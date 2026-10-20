import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson, ApiError } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { userUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { userSerializer } from "@/lib/serializers";
import { publicImageUrl } from "@/lib/storage/images";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true },
    });
    if (!user) throw new ApiError(404, "User not found.");
    return ok({
      ...userSerializer(user),
      first_name: user.firstName,
      last_name: user.lastName,
      profile_image_url: publicImageUrl(user.profile?.image ?? null),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

async function updateUser(request: NextRequest) {
  const authUser = await requireUser(request);
  const body = userUpdateSchema.parse(await readJson(request));

  if (body.username && body.username !== authUser.username) {
    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists && exists.id !== authUser.id) {
      throw new ApiError(400, "A user with that username already exists.", {
        username: ["A user with that username already exists."],
      });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.username) data.username = body.username;
  if (body.email) data.email = body.email;
  if (body.first_name !== undefined) data.firstName = body.first_name;
  if (body.last_name !== undefined) data.lastName = body.last_name;
  if (body.password) data.password = await hashPassword(body.password);

  const user = await prisma.user.update({
    where: { id: authUser.id },
    data,
    include: { profile: true },
  });
  return ok(userSerializer(user));
}

export async function PUT(request: NextRequest) {
  try {
    return await updateUser(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await updateUser(request);
  } catch (error) {
    return handleApiError(error);
  }
}
