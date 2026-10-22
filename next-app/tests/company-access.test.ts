import { describe, expect, it } from "vitest";
import type { CompanyBusinessType, CompanyRole, CompanyStatus } from "@prisma/client";
import {
  COMPANY_ROLE_PERMISSIONS,
  companyRolePermissions,
  hasCompanyPermission,
  resolveCompanySelection,
  type CompanyAccessMembership,
} from "@/lib/company-access";

function membership(
  id: number,
  role: CompanyRole,
  status: CompanyStatus = "ACTIVE",
): CompanyAccessMembership {
  return {
    membershipId: id * 10,
    membershipStatus: "ACTIVE",
    role,
    company: {
      id,
      name: `Company ${id}`,
      slug: `company-${id}`,
      description: "",
      businessType: "TOUR_OPERATOR" as CompanyBusinessType,
      status,
      isPublic: false,
      logoImageKey: null,
      coverImageKey: null,
      contactEmail: "",
      contactPhone: "",
      address: "",
      locality: null,
      district: null,
      region: null,
      country: "Tanzania",
      latitude: null,
      longitude: null,
      website: null,
      openingHours: null,
    },
  };
}

describe("company permission matrix", () => {
  it("gives owners every company permission and no platform permission", () => {
    expect(COMPANY_ROLE_PERMISSIONS.OWNER).toEqual([
      "company:read",
      "dashboard:read",
      "profile:read",
      "profile:update",
      "tours:read",
      "tours:write",
      "bookings:read",
      "bookings:update",
      "analytics:read",
      "members:read",
      "members:manage",
    ]);
    expect(COMPANY_ROLE_PERMISSIONS.OWNER).not.toContain("platform:admin");
    expect(hasCompanyPermission("OWNER", "members:manage")).toBe(true);
  });

  it("lets managers operate the company without managing members", () => {
    expect(hasCompanyPermission("MANAGER", "tours:write")).toBe(true);
    expect(hasCompanyPermission("MANAGER", "bookings:update")).toBe(true);
    expect(hasCompanyPermission("MANAGER", "analytics:read")).toBe(true);
    expect(hasCompanyPermission("MANAGER", "members:read")).toBe(false);
    expect(hasCompanyPermission("MANAGER", "members:manage")).toBe(false);
  });

  it("limits staff to the dashboard and bookings", () => {
    expect(COMPANY_ROLE_PERMISSIONS.STAFF).toEqual([
      "company:read",
      "dashboard:read",
      "bookings:read",
      "bookings:update",
    ]);
    expect(hasCompanyPermission("STAFF", "dashboard:read")).toBe(true);
    expect(hasCompanyPermission("STAFF", "bookings:read")).toBe(true);
    expect(hasCompanyPermission("STAFF", "profile:read")).toBe(false);
    expect(hasCompanyPermission("STAFF", "tours:write")).toBe(false);
    expect(hasCompanyPermission("STAFF", "members:read")).toBe(false);
  });

  it("returns the configured permission list and handles unknown roles as denied", () => {
    const permissions = companyRolePermissions("OWNER");
    expect(permissions).toEqual(COMPANY_ROLE_PERMISSIONS.OWNER);
    expect(hasCompanyPermission(null, "dashboard:read")).toBe(false);
    expect(hasCompanyPermission(undefined, "bookings:read")).toBe(false);
  });
});

describe("active company selection", () => {
  it("returns no selection without an active membership", () => {
    expect(resolveCompanySelection([], "1")).toEqual({
      reason: "none",
      membership: null,
    });
  });

  it("auto-selects the only active membership", () => {
    const only = membership(1, "OWNER");
    expect(resolveCompanySelection([only], null)).toEqual({
      reason: "ok",
      membership: only,
    });
    expect(resolveCompanySelection([only], "999")).toEqual({
      reason: "ok",
      membership: only,
    });
  });

  it("does not auto-select a suspended company", () => {
    const suspended = membership(1, "OWNER", "SUSPENDED");
    expect(resolveCompanySelection([suspended], null)).toEqual({
      reason: "unavailable",
      membership: suspended,
    });
  });

  it("requires an explicit choice when several companies are available", () => {
    const companies = [
      membership(1, "OWNER"),
      membership(2, "STAFF"),
    ];
    expect(resolveCompanySelection(companies, null)).toEqual({
      reason: "selection_required",
      membership: null,
    });
    expect(resolveCompanySelection(companies, "  ")).toEqual({
      reason: "selection_required",
      membership: null,
    });
  });

  it("honours a selector only when it matches an active membership", () => {
    const companies = [
      membership(1, "OWNER"),
      membership(2, "STAFF"),
    ];
    expect(resolveCompanySelection(companies, "2").membership?.company.id).toBe(2);
    expect(resolveCompanySelection(companies, "999")).toEqual({
      reason: "selection_required",
      membership: null,
    });
    expect(resolveCompanySelection(companies, "0").reason).toBe(
      "selection_required",
    );
  });

  it("reports a selected suspended company as unavailable", () => {
    const companies = [
      membership(1, "OWNER"),
      membership(2, "MANAGER", "SUSPENDED"),
    ];
    expect(resolveCompanySelection(companies, "2")).toEqual({
      reason: "unavailable",
      membership: companies[1],
    });
  });

  it("falls back safely after revocation removes the selected row", () => {
    const remaining = membership(2, "OWNER");
    expect(resolveCompanySelection([remaining], "1")).toEqual({
      reason: "ok",
      membership: remaining,
    });
  });
});
