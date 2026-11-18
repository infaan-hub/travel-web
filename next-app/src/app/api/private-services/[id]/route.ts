import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { privateHireServiceSerializer } from "@/lib/serializers/private-hire";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await props.params;
    const id = parseInt(rawId, 10);
    if (!Number.isInteger(id)) throw new ApiError(404, "Private Hire Service not found.");

    const service = await prisma.privateHireService.findFirst({
      where: { id, isActive: true, OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }] },
      include: {
        vehicle: true,
        driver: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            contactPhone: true,
            contactEmail: true,
            logoImageKey: true,
          },
        },
      },
    });
    if (!service) throw new ApiError(404, "Private Hire Service not found.");

    return ok(privateHireServiceSerializer(service));
  } catch (error) {
    return handleApiError(error);
  }
}
