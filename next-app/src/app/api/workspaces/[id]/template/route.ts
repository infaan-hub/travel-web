import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";
import { recordAudit } from "@/lib/audit";

type Context = { params: Promise<{ id: string }> };

/** Copies an existing workspace into a reusable template. */
export async function POST(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const source = await prisma.workspace.findUnique({
      where: { id },
      include: { selectedTours: true, selectedRooms: true },
    });
    if (!source) throw new ApiError(404, "Workspace not found.");

    const template = await prisma.workspace.create({
      data: {
        touristId: null,
        touristName: source.touristName,
        touristEmail: source.touristEmail,
        selectedHotelId: source.selectedHotelId,
        selectedTravelDriverId: source.selectedTravelDriverId,
        selectedTravelVehicleId: source.selectedTravelVehicleId,
        totalPrice: source.totalPrice,
        notes: source.notes,
        status: "draft",
        isTemplate: true,
        pricingDraft: (source.pricingDraft ?? null) as never,
        selectedTours: { connect: source.selectedTours.map((tour) => ({ id: tour.id })) },
        selectedRooms: { connect: source.selectedRooms.map((room) => ({ id: room.id })) },
      },
    });

    await recordAudit({
      actorId: (await requireStaff(request)).id,
      action: "workspace.create_template",
      entity: "workspace",
      entityId: template.id,
      after: { sourceWorkspaceId: id },
    });

    return ok({ id: template.id, is_template: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
