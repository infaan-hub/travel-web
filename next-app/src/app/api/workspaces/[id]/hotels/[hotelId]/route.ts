import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { removeWorkspaceHotel } from "@/lib/services/workspaces";
import { workspaceSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string; hotelId: string }> };

/**
 * Canonical hotel-removal endpoint. The old React client called a route that
 * supports both DELETE and POST.
 */
export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const params = await context.params;
    const workspace = await removeWorkspaceHotel(
      parseId(params.id),
      parseId(params.hotelId, "hotel id"),
    );
    return ok(workspaceSerializer(workspace));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  return DELETE(request, context);
}
