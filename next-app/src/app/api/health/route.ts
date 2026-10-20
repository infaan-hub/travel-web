import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logging";
import { pushEnabled } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Lightweight health probe used by uptime monitors and the platform. */
export async function GET() {
  const startedAt = Date.now();
  let database = "down";
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    logger.error("health check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const body = {
    status: database === "up" ? "ok" : "degraded",
    database,
    push: pushEnabled() ? "enabled" : "disabled",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: database === "up" ? 200 : 503 });
}
