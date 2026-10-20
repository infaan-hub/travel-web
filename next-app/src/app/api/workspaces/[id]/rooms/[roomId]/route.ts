import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { removeRoomFromWorkspace } from "@/lib/services/workspaces";
import { workspaceSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string; roomId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const params = await context.params;
    const workspace = await removeRoomFromWorkspace(
      parseId(params.id),
      parseId(params.roomId, "room id"),
    );
    return ok(workspaceSerializer(workspace));
  } catch (error) {
    return handleApiError(error);
  }
}
