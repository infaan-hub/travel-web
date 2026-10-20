import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { workspaceUpdateSchema } from "@/lib/validation/schemas";
import { getWorkspace, updateWorkspace } from "@/lib/services/workspaces";
import prisma from "@/lib/db/prisma";
import { workspaceSerializer } from "@/lib/serializers";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id);
    return ok(workspaceSerializer(await getWorkspace(id)));
  } catch (error) {
    return handleApiError(error);
  }
}

async function update(request: NextRequest, context: Context) {
  await requireStaff(request);
  const id = parseId((await context.params).id);
  const body = workspaceUpdateSchema.parse(await readJson(request));
  const workspace = await updateWorkspace(id, body);
  return ok(workspaceSerializer(workspace));
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
    const id = parseId((await context.params).id);
    await getWorkspace(id);
    await prisma.workspace.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
