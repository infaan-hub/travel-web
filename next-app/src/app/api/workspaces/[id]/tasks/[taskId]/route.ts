import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import {
  deleteWorkspaceTask,
  getWorkspaceTask,
  updateWorkspaceTask,
} from "@/lib/services/workspaces";
import { workspaceTaskUpdateSchema } from "@/lib/validation/schemas";
import { workspaceTaskSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string; taskId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const params = await context.params;
    const task = await getWorkspaceTask(parseId(params.id), parseId(params.taskId, "task id"));
    return ok(workspaceTaskSerializer(task));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const params = await context.params;
  const body = workspaceTaskUpdateSchema.parse(await readJson(request));
  const task = await updateWorkspaceTask(
    parseId(params.id),
    parseId(params.taskId, "task id"),
    body,
  );
  return ok(workspaceTaskSerializer(task));
}

export async function PUT(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await update(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const params = await context.params;
    await deleteWorkspaceTask(parseId(params.id), parseId(params.taskId, "task id"));
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
