import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { userSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const users = await prisma.user.findMany({ orderBy: { dateJoined: "desc" } });
    return ok(users.map(userSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}
