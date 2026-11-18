import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const applications = await prisma.partnerJoinRequest.findMany({
      where: { type: "PUBLIC_DRIVER_REGISTRATION", status: "PENDING" },
      include: {
        driver: {
          include: { user: { select: { username: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return ok({
      results: applications.map((application) => ({
        id: application.id,
        full_name: application.fullName,
        email: application.email,
        phone: application.phone,
        license_number: application.licenseNumber,
        id_type: application.idType,
        id_number: application.idNumber,
        username: application.driver?.user?.username ?? null,
        details: application.details,
        submitted_at: application.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
