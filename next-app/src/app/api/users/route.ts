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
      include: {
        companyMemberships: {
          include: {
            company: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { dateJoined: "desc" },
    });
    return ok(
      users.map((user) => ({
        ...userSerializer(user),
        is_active: user.isActive,
        companies: user.companyMemberships.map((membership) => ({
          id: membership.company.id,
          name: membership.company.name,
          slug: membership.company.slug,
          role: membership.role,
          status: membership.status,
        })),
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
