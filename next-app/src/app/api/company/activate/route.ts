import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/server-guard";
import { setActiveCompanyCookie } from "@/lib/auth/company";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/tour-company/dashboard/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login/", request.url));
  }

  const companyId = Number(request.nextUrl.searchParams.get("company_id"));
  if (!Number.isInteger(companyId) || companyId <= 0) {
    return NextResponse.redirect(new URL("/dashboard/", request.url));
  }

  const membership = await prisma.companyMembership.findFirst({
    where: { userId: user.id, companyId, status: "ACTIVE" },
    include: { company: { select: { status: true } } },
  });

  if (!membership) {
    return NextResponse.redirect(new URL("/dashboard/", request.url));
  }

  const companyStatus = membership.company.status;
  const allowed =
    companyStatus === "ACTIVE" ||
    (companyStatus === "PENDING" && membership.role === "OWNER");

  if (!allowed) {
    return NextResponse.redirect(new URL("/dashboard/", request.url));
  }

  await setActiveCompanyCookie(companyId);

  const next = safeNext(request.nextUrl.searchParams.get("next"));
  return NextResponse.redirect(new URL(next, request.url));
}


