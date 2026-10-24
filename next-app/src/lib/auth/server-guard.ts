import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import { verifyToken } from "@/lib/auth/tokens";
import { SESSION_COOKIE } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/session";

export async function getServerUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token, "access");
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: {
      id: true,
      username: true,
      email: true,
      isStaff: true,
      isSuperuser: true,
      isActive: true,
      accountType: true,
      sessionVersion: true,
      deletedAt: true,
    },
  });
  if (!user || !user.isActive || user.deletedAt) return null;
  if (payload.ver !== undefined && payload.ver !== user.sessionVersion) return null;
  return user;
}

export async function requirePageUser(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePageStaff(): Promise<AuthUser> {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (!user.isStaff) redirect("/dashboard");
  return user;
}
