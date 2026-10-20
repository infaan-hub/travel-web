import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const logs = await prisma.auditLog.findMany({
      where: entity ? { entity } : undefined,
      include: { actor: { select: { id: true, username: true, isStaff: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entity_id: log.entityId,
        actor: log.actor ? { id: log.actor.id, username: log.actor.username } : null,
        before: log.before,
        after: log.after,
        ip_address: log.ipAddress,
        created_at: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
