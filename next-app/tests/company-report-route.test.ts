import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCompanyMember: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth/company", () => ({
  requireCompanyMember: mocks.requireCompanyMember,
}));

vi.mock("@/lib/db/prisma", () => ({
  default: { booking: { findMany: mocks.findMany } },
}));

import { GET } from "@/app/api/company/reports/bookings/route";
import type { NextRequest } from "next/server";

function request(path = "/api/company/reports/bookings") {
  return {
    nextUrl: new URL(`https://travel.example${path}`),
  } as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCompanyMember.mockResolvedValue({
    company: { id: 27, slug: "island-tours" },
  });
});

describe("company booking financial export", () => {
  it("exports only the selected company's booking snapshots without customer PII", async () => {
    mocks.findMany.mockResolvedValue([
      {
        reference: "INF-2026-1234",
        createdAt: new Date("2026-05-05T10:00:00.000Z"),
        travelDate: new Date("2026-06-01T00:00:00.000Z"),
        tourTitleSnapshot: '=HYPERLINK("bad")',
        travelers: 2,
        unitPriceAtBooking: { toString: () => "15000.00" },
        totalPriceAtBooking: { toString: () => "30000.00" },
        status: "confirmed",
      },
    ]);

    const response = await GET(request());
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain(
      "island-tours-booking-value-report.csv",
    );
    expect(mocks.requireCompanyMember).toHaveBeenCalledWith(
      expect.anything(),
      { permission: "reports:export" },
    );
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 27 },
        take: 10_001,
      }),
    );
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("15000.00");
    expect(csv).not.toContain("email");
    expect(csv).not.toContain("guest@example.com");
  });

  it("accepts a created-date range and reports invalid ranges", async () => {
    mocks.findMany.mockResolvedValue([]);
    const response = await GET(request("?from=2026-05-01&to=2026-05-31"));

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 27,
          createdAt: {
            gte: new Date("2026-05-01T00:00:00.000Z"),
            lt: new Date("2026-06-01T00:00:00.000Z"),
          },
        },
      }),
    );

    const invalid = await GET(request("?from=2026-06-01&to=2026-05-31"));
    expect(invalid.status).toBe(400);
  });
});
