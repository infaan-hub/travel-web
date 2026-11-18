import type { NextRequest } from "next/server";
import { ApiError, handleApiError, ok, parseId, readJson } from "@/lib/api/http";
import { requireStaff } from "@/lib/auth/session";
import { adminCompanyOwnerCredentialsSchema } from "@/lib/validation/company";
import { hashPassword } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import { requestAuditActor } from "@/lib/api/request-context";
import prisma from "@/lib/db/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireStaff(request);
    const companyId = parseId((await context.params).id);
    const input = adminCompanyOwnerCredentialsSchema.parse(await readJson(request));
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, account: { select: { id: true } } },
    });
    if (!company) throw new ApiError(404, "Company not found.");
    if (company.account) throw new ApiError(409, "This company already has a login.");

    const username = input.owner_username.trim();
    const email = input.owner_email.trim().toLowerCase();
    const conflict = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });
    if (conflict?.username === username) {
      throw new ApiError(400, "A user with that username already exists.", {
        owner_username: ["A user with that username already exists."],
      });
    }
    if (conflict?.email === email) {
      throw new ApiError(400, "A user with that email already exists.", {
        owner_email: ["A user with that email already exists."],
      });
    }

    const linked = await prisma.company.update({
      where: { id: companyId },
      data: {
        account: {
          create: {
            username,
            email,
            password: await hashPassword(input.owner_password),
            accountType: "PRIVATE_HIRE_COMPANY",
            profile: { create: {} },
          },
        },
      },
      select: { account: { select: { id: true, username: true, email: true } } },
    });
    const auditActor = requestAuditActor(request, actor);
    await recordAudit({
      actorId: actor.id,
      companyId,
      action: "company.account.create",
      entity: "company",
      entityId: companyId,
      after: { account_username: username, account_email: email },
      ipAddress: auditActor.ipAddress,
      userAgent: auditActor.userAgent,
    });
    return ok(linked.account);
  } catch (error) {
    return handleApiError(error);
  }
}
