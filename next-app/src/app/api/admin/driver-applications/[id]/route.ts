import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireStaff(request);
    const id = parseId((await context.params).id, "application id");
    const body = await request.json().catch(() => null) as { status?: unknown; admin_notes?: unknown } | null;
    if (body?.status !== "APPROVED" && body?.status !== "REJECTED") {
      throw new ApiError(400, "Choose approve or reject for this application.");
    }
    const existing = await prisma.partnerJoinRequest.findFirst({
      where: { id, type: "PUBLIC_DRIVER_REGISTRATION" },
      include: { driver: { include: { user: true } } },
    });
    if (!existing) throw new ApiError(404, "Driver application not found.");
    if (existing.status !== "PENDING") throw new ApiError(409, "This application has already been reviewed.");
    if (!existing.driver?.user) throw new ApiError(409, "The application has no linked driver login.");

    const adminNotes = typeof body.admin_notes === "string" ? body.admin_notes.trim().slice(0, 2000) : "";
    await prisma.$transaction(async (tx) => {
      const changed = await tx.partnerJoinRequest.updateMany({
        where: { id, type: "PUBLIC_DRIVER_REGISTRATION", status: "PENDING" },
        data: { status: body.status as "APPROVED" | "REJECTED", adminNotes },
      });
      if (changed.count !== 1) throw new ApiError(409, "This application was reviewed by another administrator.");
      const approved = body.status === "APPROVED";
      await tx.privateHireDriver.update({ where: { id: existing.driver!.id }, data: { isPublic: approved, isActive: approved } });
      await tx.user.update({
        where: { id: existing.driver!.user!.id },
        data: { isActive: approved, sessionVersion: { increment: 1 } },
      });
    });

    const approved = body.status === "APPROVED";
    const emailResult = await sendEmail({
      to: existing.email,
      subject: approved ? "Your Public Hire Driver application was approved" : "Update on your Public Hire Driver application",
      text: approved
        ? `Hello ${existing.fullName}, your Public Hire Driver application was approved. You can now sign in at ${new URL("/login/", request.url).toString()} with the username and password you chose, then open your driver dashboard.`
        : `Hello ${existing.fullName}, your Public Hire Driver application was not approved at this time.${adminNotes ? `\n\nAdmin note: ${adminNotes}` : ""}`,
    });
    return ok({ success: true, status: body.status, notification_sent: emailResult.sent });
  } catch (error) {
    return handleApiError(error);
  }
}
