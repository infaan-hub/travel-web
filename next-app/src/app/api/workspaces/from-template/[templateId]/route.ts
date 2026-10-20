import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ templateId: string }> };

/** Creates a new workspace from a saved template. */
export async function POST(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const templateId = parseId((await context.params).templateId);
    const template = await prisma.workspace.findFirst({
      where: { id: templateId, isTemplate: true },
      include: { selectedTours: true, selectedRooms: true },
    });
    if (!template) throw new ApiError(404, "Template not found.");

    const body = (await request.json().catch(() => ({}))) as {
      tourist_id?: number;
      tourist_name?: string;
      tourist_email?: string;
    };

    const workspace = await prisma.workspace.create({
      data: {
        touristId: body.tourist_id ?? null,
        touristName: body.tourist_name ?? template.touristName,
        touristEmail: body.tourist_email ?? template.touristEmail,
        selectedHotelId: template.selectedHotelId,
        selectedTravelDriverId: template.selectedTravelDriverId,
        selectedTravelVehicleId: template.selectedTravelVehicleId,
        totalPrice: template.totalPrice,
        notes: template.notes,
        status: "draft",
        pricingDraft: (template.pricingDraft ?? null) as never,
        selectedTours: { connect: template.selectedTours.map((tour) => ({ id: tour.id })) },
        selectedRooms: { connect: template.selectedRooms.map((room) => ({ id: room.id })) },
      },
    });

    return ok({ id: workspace.id, is_template: false }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
