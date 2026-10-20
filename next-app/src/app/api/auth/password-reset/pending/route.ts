import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

/**
 * Staff view of pending password resets and unverified accounts. Codes are
 * shown here so the agent can verify the customer in person.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim().toLowerCase() ?? null;

    const [resets, unverified] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          resetRequestedAt: { not: null },
          ...(email ? { email } : {}),
        },
        select: {
          id: true,
          username: true,
          email: true,
          resetRequestedAt: true,
          emailVerified: true,
        },
        orderBy: { resetRequestedAt: "desc" },
        take: 50,
      }),
      prisma.user.findMany({
        where: { deletedAt: null, emailVerified: false, ...(email ? { email } : {}) },
        select: { id: true, username: true, email: true, dateJoined: true },
        orderBy: { dateJoined: "desc" },
        take: 50,
      }),
    ]);

    return ok({
      resets,
      unverified,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
