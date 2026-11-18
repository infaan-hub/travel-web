import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { privateHireServiceSerializer } from "@/lib/serializers/private-hire";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const companyIdRaw = searchParams.get("company_id");

    const where: {
      isActive: boolean;
      title?: { contains: string; mode: "insensitive" };
      companyId?: number;
    } = {
      isActive: true,
    };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (companyIdRaw) {
      const cId = parseInt(companyIdRaw, 10);
      if (Number.isInteger(cId)) where.companyId = cId;
    }

    const services = await prisma.privateHireService.findMany({
      where: { ...where, OR: [{ companyId: null }, { company: { status: "ACTIVE", isPublic: true } }] },
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
      orderBy: { createdAt: "desc" },
    });

    return ok({
      results: services.map(privateHireServiceSerializer),
      count: services.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
