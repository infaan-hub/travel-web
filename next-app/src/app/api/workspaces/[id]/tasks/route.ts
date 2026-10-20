import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { createWorkspaceTask, listWorkspaceTasks } from "@/lib/services/workspaces";
import { workspaceTaskSchema } from "@/lib/validation/schemas";
import { workspaceTaskSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const workspaceId = parseId((await context.params).id);
    const tasks = await listWorkspaceTasks(workspaceId);
    return ok(tasks.map(workspaceTaskSerializer));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const workspaceId = parseId((await context.params).id);
    const body = workspaceTaskSchema.parse(await readJson(request));
    const task = await createWorkspaceTask(workspaceId, body);
    return ok(workspaceTaskSerializer(task), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
