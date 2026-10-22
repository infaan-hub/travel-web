import "server-only";
import prisma from "@/lib/db/prisma";
import { featureEnabled } from "@/lib/env";
import { logger } from "@/lib/logging";

export type AuditInput = {
  actorId?: number | null;
  companyId?: number | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Records an administrative action. Failures never break the request, but they
 * are logged so a broken audit table is visible.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  if (!featureEnabled("FEATURE_AUDIT_LOG")) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        companyId: input.companyId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId === null || input.entityId === undefined ? null : String(input.entityId),
        before: (input.before ?? null) as never,
        after: (input.after ?? null) as never,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent?.slice(0, 255) ?? null,
      },
    });
  } catch (error) {
    logger.error("failed to write audit log", {
      action: input.action,
      entity: input.entity,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
