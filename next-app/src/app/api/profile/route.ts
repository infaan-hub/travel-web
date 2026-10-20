import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, readJson } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { readPayload, storeUpload, stripFiles } from "@/lib/api/body";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { publicImageUrl } from "@/lib/storage/images";
import { deleteImage } from "@/lib/storage/images";

async function loadProfile(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new ApiError(404, "User not found.");
  let profile = user.profile;
  if (!profile) {
    profile = await prisma.profile.create({ data: { userId } });
  }
  return { user, profile };
}

function serializeProfile(user: { id: number; username: string; email: string }, profile: {
  id: number;
  fullName: string;
  phone: string;
  address: string;
  image: string | null;
}) {
  return {
    id: profile.id,
    full_name: profile.fullName,
    email: user.email,
    phone: profile.phone,
    address: profile.address,
    profile_image: publicImageUrl(profile.image),
    username: user.username,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const { user, profile } = await loadProfile(authUser.id);
    return ok(serializeProfile(user, profile));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest) {
  const authUser = await requireUser(request);
  const { user, profile } = await loadProfile(authUser.id);
  const payload = await readPayload(request);
  const body = profileUpdateSchema.parse(stripFiles(payload));

  const profileData: Record<string, unknown> = {};
  if (body.full_name !== undefined) profileData.fullName = body.full_name;
  if (body.phone !== undefined) profileData.phone = body.phone;
  if (body.address !== undefined) profileData.address = body.address;

  let email = user.email;
  if (body.email !== undefined && body.email !== "") {
    const existing = await prisma.user.findFirst({ where: { email: body.email } });
    if (existing && existing.id !== user.id) {
      throw new ApiError(400, "A user with that email already exists.", {
        email: ["A user with that email already exists."],
      });
    }
    email = body.email;
  }

  // Clients may upload `image` or `profile_image`.
  const uploaded =
    (await storeUpload(payload, "image", "profiles")) ??
    (await storeUpload(payload, "profile_image", "profiles"));
  if (uploaded) {
    profileData.image = uploaded;
    await deleteImage(profile.image);
  }

  const [updatedUser, updatedProfile] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { email } }),
    prisma.profile.update({ where: { id: profile.id }, data: profileData }),
  ]);

  return ok(serializeProfile(updatedUser, updatedProfile));
}

export async function PUT(request: NextRequest) {
  try {
    return await update(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    return await update(request);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const { user, profile } = await loadProfile(authUser.id);
    if (profile.image) {
      await deleteImage(profile.image);
      await prisma.profile.update({ where: { id: profile.id }, data: { image: null } });
    }
    return ok(serializeProfile(user, { ...profile, image: null }));
  } catch (error) {
    return handleApiError(error);
  }
}
