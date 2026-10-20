import type { NextRequest } from "next/server";
import { handleApiError, ok, readJson } from "@/lib/api/http";
import { optionalAuth } from "@/lib/auth/session";
import { enforceRateLimit, clientIp } from "@/lib/security/rate-limit";
import { trackVisitSchema } from "@/lib/validation/schemas";
import prisma from "@/lib/db/prisma";
import { visitSerializer } from "@/lib/serializers";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(request, "track-visit", 120, 60 * 1000);
    const body = trackVisitSchema.parse(await readJson(request));
    const context = await optionalAuth(request);
    const sessionId =
      body.session_id || `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const pageUrl = body.page_url || body.page || "/";

    let tourId = body.tour_id ?? null;
    if (!tourId) {
      const match = pageUrl.match(/^\/tour\/(\d+)/);
      if (match) tourId = Number(match[1]);
    }

    const visit = await prisma.visitorTracking.create({
      data: {
        sessionId: sessionId.slice(0, 100),
        pageUrl: pageUrl.slice(0, 500),
        userId: context?.user.id ?? null,
        ipAddress: clientIp(request).slice(0, 100),
        userAgent: (request.headers.get("user-agent") || "").slice(0, 500),
        isAuthenticated: Boolean(context),
        tourId,
      },
    });
    return ok(visitSerializer(visit), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
