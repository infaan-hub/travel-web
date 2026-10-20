import "server-only";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logging";

export type FunnelStage =
  | "view"
  | "booking_started"
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled";

export type FunnelInput = {
  sessionId?: string | null;
  tourId?: number | null;
  bookingId?: number | null;
  metadata?: Record<string, unknown> | null;
};

/** Records a funnel event. Failures never break the user journey. */
export async function recordFunnelEvent(stage: FunnelStage, input: FunnelInput): Promise<void> {
  try {
    await prisma.funnelEvent.create({
      data: {
        sessionId: (input.sessionId || "anonymous").slice(0, 100),
        stage,
        tourId: input.tourId ?? null,
        bookingId: input.bookingId ?? null,
        metadata: (input.metadata ?? null) as never,
      },
    });
  } catch (error) {
    logger.warn("failed to record funnel event", {
      stage,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function funnelSummary(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const events = await prisma.funnelEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { stage: true, sessionId: true, createdAt: true },
  });

  const byStage = new Map<FunnelStage, number>();
  const sessionsByStage = new Map<FunnelStage, Set<string>>();
  for (const event of events) {
    const stage = event.stage as FunnelStage;
    byStage.set(stage, (byStage.get(stage) ?? 0) + 1);
    if (!sessionsByStage.has(stage)) sessionsByStage.set(stage, new Set());
    sessionsByStage.get(stage)!.add(event.sessionId);
  }

  const order: FunnelStage[] = [
    "view",
    "booking_started",
    "booking_created",
    "booking_confirmed",
    "booking_cancelled",
  ];

  return {
    days,
    stages: order.map((stage) => ({
      stage,
      events: byStage.get(stage) ?? 0,
      sessions: sessionsByStage.get(stage)?.size ?? 0,
    })),
  };
}
