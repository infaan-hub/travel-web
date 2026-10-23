import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/companies/route";

const { prismaCompanyCreate, requireStaff } = vi.hoisted(() => ({
  prismaCompanyCreate: vi.fn(),
  requireStaff: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    company: {
      create: prismaCompanyCreate,
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireStaff,
}));

vi.mock("@/lib/audit", () => ({
  recordAudit: vi.fn(),
}));

describe("POST /api/admin/companies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaff.mockResolvedValue({ id: 5 });
    prismaCompanyCreate.mockImplementation(async ({ data }) => ({
      ...data,
      id: 31,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      suspendedAt: null,
      archivedAt: null,
      createdBy: null,
      memberships: [],
      _count: { tours: 0, bookings: 0 },
    }));
  });

  it("calls Prisma create and returns the saved company with HTTP 200", async () => {
    const request = new NextRequest("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Acme Safaris" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prismaCompanyCreate).toHaveBeenCalledOnce();
    expect(prismaCompanyCreate.mock.calls[0][0].data).toMatchObject({
      name: "Acme Safaris",
      slug: "acme-safaris",
      status: "PENDING",
      isPublic: false,
      createdByUserId: 5,
    });
    expect(prismaCompanyCreate.mock.calls[0][0]).not.toHaveProperty("include");
    expect(body).toMatchObject({
      id: 31,
      name: "Acme Safaris",
      slug: "acme-safaris",
    });
  });
});
