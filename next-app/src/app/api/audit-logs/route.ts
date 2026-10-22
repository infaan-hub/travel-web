import type { NextRequest } from "next/server";
import { handleApiError, ok } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  try {
    await requireStaff(request);
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity") ?? undefined;
    const companyId = searchParams.get("company_id") ?? searchParams.get("company");
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(companyId ? { companyId: Number(companyId) } : {}),
      },
      include: { actor: { select: { id: true, username: true, isStaff: true } }, company: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok({
      logs: logs.map((log) => ({
        id: log.id,
        company: log.company
          ? { id: log.company.id, name: log.company.name, slug: log.company.slug }
          : null,
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
