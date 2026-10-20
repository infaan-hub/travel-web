import type { NextRequest } from "next/server";
import { handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { setWorkspacePricing } from "@/lib/services/workspaces";
import { workspaceSerializer } from "@/lib/serializers";
import { workspacePricingSchema } from "@/lib/validation/schemas";

type Context = { params: Promise<{ id: string }> };

async function save(request: NextRequest, context: Context) {
  await requireStaff(request);
  const workspaceId = parseId((await context.params).id);
  const body = workspacePricingSchema.parse(await readJson(request));
  const workspace = await setWorkspacePricing(workspaceId, body);
  return ok(workspaceSerializer(workspace));
}

export async function POST(request: NextRequest, context: Context) {
  try {
    return await save(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    return await save(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}
