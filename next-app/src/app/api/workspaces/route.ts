import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { listResponse, paginatedResponse, paginationFrom } from "@/lib/api/pagination";
import { workspaceCreateSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { workspaceSerializer } from "@/lib/serializers";
import { createWorkspace, WORKSPACE_INCLUDE } from "@/lib/services/workspaces";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const where: Prisma.WorkspaceWhereInput = {};
    const status = searchParams.get("status");
    if (status && ["draft", "approved", "completed"].includes(status)) {
      where.status = status as "draft" | "approved" | "completed";
    }
    const tourist = searchParams.get("tourist");
    if (tourist) where.touristId = Number(tourist);
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { touristName: { contains: search, mode: "insensitive" } },
        { touristEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const pagination = paginationFrom(searchParams);
    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        include: WORKSPACE_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: pagination?.skip ?? 0,
        take: pagination?.take ?? 500,
      }),
      prisma.workspace.count({ where }),
    ]);
    const data = workspaces.map(workspaceSerializer);
    return pagination ? paginatedResponse(request, data, total, pagination) : listResponse(data, total);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff(request);
    const body = workspaceCreateSchema.parse(await readJson(request));
    const workspace = await createWorkspace(body);
    return ok(workspaceSerializer(workspace), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
