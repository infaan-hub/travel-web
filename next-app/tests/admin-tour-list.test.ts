import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tours/route";

const { tourFindMany, tourCount, optionalAuth } = vi.hoisted(() => ({
  tourFindMany: vi.fn(),
  tourCount: vi.fn(),
  optionalAuth: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    tour: {
      findMany: tourFindMany,
      count: tourCount,
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  optionalAuth,
  requireStaff: vi.fn(),
}));

describe("GET /api/tours admin listing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    optionalAuth.mockResolvedValue(null);
    tourFindMany.mockResolvedValue([]);
    tourCount.mockResolvedValue(0);
  });

  it("includes unpublished tours for staff requesting all tours", async () => {
    optionalAuth.mockResolvedValue({ user: { isStaff: true } });

    const response = await GET(
      new NextRequest("http://localhost/api/tours?all=true&page=1&page_size=15"),
    );

    expect(response.status).toBe(200);
    expect(tourFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
      }),
    );
  });

  it("keeps public visibility filters for visitors", async () => {
    const response = await GET(new NextRequest("http://localhost/api/tours?all=true"));

    expect(response.status).toBe(200);
    expect(optionalAuth).toHaveBeenCalledOnce();
    expect(tourFindMany.mock.calls[0][0].where).toHaveProperty("AND");
  });
});
