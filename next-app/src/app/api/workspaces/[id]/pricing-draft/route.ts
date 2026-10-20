import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ id: string }> };

/** Stores the pricing draft so it survives reloads and other devices. */
export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const workspace = await prisma.workspace.findUnique({ where: { id } });
    if (!workspace) throw new ApiError(404, "Workspace not found.");

    const draft = (await readJson(request)) as Record<string, unknown>;
    const updated = await prisma.workspace.update({
      where: { id },
      data: { pricingDraft: draft as never },
    });
    return ok({ id: updated.id, pricing_draft: updated.pricingDraft });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      select: { id: true, pricingDraft: true },
    });
    if (!workspace) throw new ApiError(404, "Workspace not found.");
    return ok({ id: workspace.id, pricing_draft: workspace.pricingDraft });
  } catch (error) {
    return handleApiError(error);
  }
}
