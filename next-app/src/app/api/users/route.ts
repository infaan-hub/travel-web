import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { userSerializer } from "@/lib/serializers";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      include: { companyAccount: { select: { id: true, name: true, slug: true } } },
      orderBy: { dateJoined: "desc" },
    });
    return ok(
      users.map((user) => ({
        ...userSerializer(user),
        is_active: user.isActive,
        company: user.companyAccount,
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
