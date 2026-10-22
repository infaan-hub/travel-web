import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import type { Profile, User } from "@prisma/client";
import { handleApiError, ok, readJson, ApiError } from "@/lib/api/http";
import { ACTIVE_COMPANY_COOKIE, requireUser } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { userUpdateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import {
  userCompanyNavigationSerializer,
  userSerializer,
} from "@/lib/serializers";
import { resolveCompanySelection } from "@/lib/company-access";
import { listActiveCompanyMemberships } from "@/lib/services/company-access";
import { publicImageUrl } from "@/lib/storage/images";

/**
 * Company roles are returned for navigation only. Suspended/archived companies
 * are excluded and no membership or platform data is exposed.
 */
async function companyNavigationFor(userId: number) {
  const memberships = await listActiveCompanyMemberships(userId);
  const available = memberships.filter(
    (membership) => membership.company.status === "ACTIVE",
  );
  const jar = await cookies();
  const selector = jar.get(ACTIVE_COMPANY_COOKIE)?.value ?? null;
  const selection = resolveCompanySelection(available, selector);
  const activeCompanyId =
    selection.reason === "ok" && selection.membership
      ? selection.membership.company.id
      : available.length === 1
        ? available[0].company.id
        : null;
  return userCompanyNavigationSerializer(available, activeCompanyId);
}

function userPayload(
  user: User & { profile: Profile | null },
  companies: Record<string, unknown>,
) {
  return {
    ...userSerializer(user),
    first_name: user.firstName,
    last_name: user.lastName,
    profile_image_url: publicImageUrl(user.profile?.image ?? null),
    ...companies,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireUser(request);
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { profile: true },
    });
    if (!user) throw new ApiError(404, "User not found.");
    const companies = await companyNavigationFor(user.id);
    return ok(userPayload(user, companies));
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
  const companies = await companyNavigationFor(user.id);
  return ok(userPayload(user, companies));
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
