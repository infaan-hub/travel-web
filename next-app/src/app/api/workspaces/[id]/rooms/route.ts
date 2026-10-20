import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { addRoomToWorkspace } from "@/lib/services/workspaces";
import { workspaceSerializer } from "@/lib/serializers";
import { z } from "zod";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ room_id: z.coerce.number().int().positive() });

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const workspaceId = parseId((await context.params).id);
    const body = schema.parse(await readJson(request));
    const workspace = await addRoomToWorkspace(workspaceId, body.room_id);
    return ok(workspaceSerializer(workspace), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
