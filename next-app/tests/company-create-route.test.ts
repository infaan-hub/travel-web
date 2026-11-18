import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/companies/route";

const {
  prismaCompanyCreate,
  prismaUserFindFirst,
  prismaUserFindUnique,
  requireStaff,
} = vi.hoisted(() => ({
  prismaCompanyCreate: vi.fn(),
  prismaUserFindFirst: vi.fn(),
  prismaUserFindUnique: vi.fn(),
  requireStaff: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    company: {
      create: prismaCompanyCreate,
    },
    user: {
      findFirst: prismaUserFindFirst,
      findUnique: prismaUserFindUnique,
    },
  },
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn(async (password: string) => `hashed:${password}`),
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
    prismaUserFindFirst.mockResolvedValue(null);
    prismaUserFindUnique.mockResolvedValue(null);
    prismaCompanyCreate.mockImplementation(async ({ data, include }) => ({
      ...data,
      id: 31,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      suspendedAt: null,
      archivedAt: null,
      createdBy: null,
      memberships: include?.memberships ? [{ id: 41 }] : [],
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

  it("creates the company and its owner membership in one nested write", async () => {
    const request = new NextRequest("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Island Private Hire",
        owner_username: "islandowner",
        owner_email: "owner@example.com",
        owner_password: "temporary-password",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: 31,
      name: "Island Private Hire",
      members_count: 1,
    });
    const createData = prismaCompanyCreate.mock.calls[0][0].data;
    expect(createData).toMatchObject({
      status: "PENDING",
      isPublic: false,
      createdBy: { connect: { id: 5 } },
      memberships: {
        create: {
          role: "OWNER",
          status: "ACTIVE",
          assignedBy: { connect: { id: 5 } },
          user: {
            create: {
              username: "islandowner",
              email: "owner@example.com",
              password: "hashed:temporary-password",
              accountType: "PRIVATE_HIRE_COMPANY",
              profile: { create: {} },
            },
          },
        },
      },
    });
  });

  it("rejects incomplete owner credentials without creating a company", async () => {
    const request = new NextRequest("http://localhost/api/admin/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Island Private Hire",
        owner_username: "islandowner",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(prismaCompanyCreate).not.toHaveBeenCalled();
  });
});
