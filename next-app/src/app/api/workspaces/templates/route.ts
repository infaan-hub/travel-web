import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const templates = await prisma.workspace.findMany({
      where: { isTemplate: true },
      include: { selectedTours: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({
      templates: templates.map((template) => ({
        id: template.id,
        notes: template.notes,
        total_price: template.totalPrice ? template.totalPrice.toString() : null,
        tourist_name: template.touristName,
        created_at: template.createdAt.toISOString(),
        tours: template.selectedTours.map((tour) => ({ id: tour.id, title: tour.title })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
