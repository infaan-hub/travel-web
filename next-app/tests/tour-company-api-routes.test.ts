import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/http";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  requireUser: vi.fn(),
  userFindUnique: vi.fn(),
  createOwner: vi.fn(),
  createApplication: vi.fn(),
  deleteImage: vi.fn(),
  recordAuditActor: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireStaff: mocks.requireStaff,
  requireUser: mocks.requireUser,
}));

vi.mock("@/lib/db/prisma", () => ({
  default: { user: { findUnique: mocks.userFindUnique } },
}));

vi.mock("@/lib/services/auth", () => ({
  createTourCompanyOwner: mocks.createOwner,
}));

vi.mock("@/lib/services/tour-company-applications", () => ({
  createTourCompanyApplication: mocks.createApplication,
}));

vi.mock("@/lib/storage/images", () => ({
  deleteImage: mocks.deleteImage,
}));

vi.mock("@/lib/api/request-context", () => ({
  requestAuditActor: mocks.recordAuditActor,
}));

vi.mock("@/lib/serializers", () => ({
  adminCompanyListSerializer: (company: unknown) => company,
}));

import { POST as createOwnerPost } from "@/app/api/admin/tour-company-owners/route";
import { POST as submitApplicationPost } from "@/app/api/tour-company/application/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireStaff.mockResolvedValue({ id: 3 });
  mocks.requireUser.mockResolvedValue({ id: 17 });
  mocks.userFindUnique.mockResolvedValue({ accountType: "TOUR_COMPANY" });
  mocks.createOwner.mockResolvedValue({
    id: 22,
    username: "islandowner",
    email: "owner@example.com",
    accountType: "TOUR_COMPANY",
  });
  mocks.createApplication.mockResolvedValue({
    id: 31,
    name: "Island Tours",
    status: "PENDING",
    isPublic: false,
  });
  mocks.recordAuditActor.mockReturnValue({ id: 17 });
  mocks.deleteImage.mockResolvedValue(undefined);
});

describe("POST /api/admin/tour-company-owners", () => {
  it("creates an owner using staff authorization and returns credentials metadata", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/tour-company-owners",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: " islandowner ",
          email: "owner@example.com",
          password: "secure-password",
        }),
      },
    );

    const response = await createOwnerPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      id: 22,
      username: "islandowner",
      accountType: "TOUR_COMPANY",
    });
    expect(mocks.requireStaff).toHaveBeenCalledOnce();
    expect(mocks.createOwner).toHaveBeenCalledWith({
      username: "islandowner",
      email: "owner@example.com",
      password: "secure-password",
    });
  });

  it("does not create an owner when staff authorization fails", async () => {
    mocks.requireStaff.mockRejectedValueOnce(new ApiError(403, "Not authorized."));
    const request = new NextRequest(
      "http://localhost/api/admin/tour-company-owners",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "islandowner",
          email: "owner@example.com",
          password: "secure-password",
        }),
      },
    );

    const response = await createOwnerPost(request);

    expect(response.status).toBe(403);
    expect(mocks.createOwner).not.toHaveBeenCalled();
  });
});

describe("POST /api/tour-company/application", () => {
  it("creates a pending, private application for an authenticated Tour Company user", async () => {
    const request = new NextRequest(
      "http://localhost/api/tour-company/application",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Island Tours" }),
      },
    );

    const response = await submitApplicationPost(request);

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      id: 31,
      name: "Island Tours",
      status: "PENDING",
      isPublic: false,
    });
    expect(mocks.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Island Tours" }),
      { id: 17 },
      { logoImageKey: null, coverImageKey: null },
    );
  });

  it("rejects customer accounts before creating an application", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ accountType: "CUSTOMER" });
    const request = new NextRequest(
      "http://localhost/api/tour-company/application",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Island Tours" }),
      },
    );

    const response = await submitApplicationPost(request);

    expect(response.status).toBe(403);
    expect(mocks.createApplication).not.toHaveBeenCalled();
  });
});
