import "server-only";
import { forbidden, redirect } from "next/navigation";
import { ApiError } from "@/lib/api/http";
import { requireUser, type AuthUser } from "@/lib/auth/session";
import { getServerUser } from "@/lib/auth/server-guard";
import prisma from "@/lib/db/prisma";

export async function requirePrivateHireDriver(request: Request) {
  const user = await requireUser(request);
  if (user.accountType !== "DRIVER") {
    throw new ApiError(403, "A private-hire driver account is required.");
  }
  const driver = await prisma.privateHireDriver.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ isPublic: true, companyId: null }, { company: { status: "ACTIVE" } }],
    },
    include: { company: { select: { id: true, name: true, status: true } } },
  });
  if (!driver) throw new ApiError(403, "This driver account is not currently active.");
  return { user, driver };
}

export async function requirePagePrivateHireDriver(): Promise<{
  user: AuthUser;
  driver: { id: number; name: string; company: { id: number; name: string } | null };
}> {
  const user = await getServerUser();
  if (!user) redirect("/login/?from=%2Fdriver%2Fdashboard%2F");
  if (user.accountType !== "DRIVER") redirect("/");
  const driver = await prisma.privateHireDriver.findFirst({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ isPublic: true, companyId: null }, { company: { status: "ACTIVE" } }],
    },
    select: { id: true, name: true, company: { select: { id: true, name: true } } },
  });
  if (!driver) forbidden();
  return { user, driver };
}
