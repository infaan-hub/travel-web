import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/token/refresh/route";

const {
  enforceRateLimit,
  refreshTokenFromRequest,
  setAccessCookie,
  verifyToken,
  signAccessToken,
  prismaUserFindUnique,
} = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  refreshTokenFromRequest: vi.fn(),
  setAccessCookie: vi.fn(),
  verifyToken: vi.fn(),
  signAccessToken: vi.fn(),
  prismaUserFindUnique: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({ enforceRateLimit }));
vi.mock("@/lib/auth/session", () => ({
  refreshTokenFromRequest,
  setAccessCookie,
}));
vi.mock("@/lib/auth/tokens", () => ({ verifyToken, signAccessToken }));
vi.mock("@/lib/db/prisma", () => ({
  default: { user: { findUnique: prismaUserFindUnique } },
}));

describe("GET /api/token/refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshTokenFromRequest.mockResolvedValue("refresh-token");
    verifyToken.mockResolvedValue({ sub: "7", ver: 1 });
    prismaUserFindUnique.mockResolvedValue({
      id: 7,
      username: "company",
      isStaff: false,
      isActive: true,
      sessionVersion: 1,
      deletedAt: null,
    });
    signAccessToken.mockResolvedValue("new-access-token");
  });

  it("refreshes the access cookie and returns to the requested internal page", async () => {
    const response = await GET(
      new NextRequest("https://travel.test/api/token/refresh?next=%2Ftour-company%2Fdashboard%2F"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://travel.test/tour-company/dashboard/");
    expect(setAccessCookie).toHaveBeenCalledWith("new-access-token");
  });

  it("sends unauthenticated users to login with the dashboard as their return path", async () => {
    refreshTokenFromRequest.mockResolvedValue(null);
    const response = await GET(
      new NextRequest("https://travel.test/api/token/refresh?next=%2Ftour-company%2Fdashboard%2F"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://travel.test/login/?from=%2Ftour-company%2Fdashboard%2F",
    );
    expect(setAccessCookie).not.toHaveBeenCalled();
  });

  it("rejects an external return URL and uses the safe dashboard default", async () => {
    const response = await GET(
      new NextRequest("https://travel.test/api/token/refresh?next=https%3A%2F%2Fevil.test"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://travel.test/tour-company/dashboard/");
  });

  it("rejects a backslash-based external return URL", async () => {
    const response = await GET(
      new NextRequest("https://travel.test/api/token/refresh?next=%2F%5Cevil.test"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://travel.test/tour-company/dashboard/");
  });
});
