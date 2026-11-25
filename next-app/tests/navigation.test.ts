import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/context/AuthContext";
import {
  getBottomNavItems,
  getRoleHomeHref,
  getRoleProfileHref,
  getSidebarNavItems,
  isNavItemActive,
  normalizePathname,
  resolveNavRole,
} from "@/lib/navigation";

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    username: "tester",
    email: "tester@example.com",
    is_staff: false,
    account_type: "CUSTOMER",
    date_joined: "2026-01-01T00:00:00Z",
    company: null,
    ...overrides,
  };
}

describe("role-based navigation", () => {
  it("resolves every user role accurately", () => {
    expect(resolveNavRole(null)).toBe("guest");
    expect(resolveNavRole(makeUser())).toBe("customer");
    expect(resolveNavRole(makeUser({ account_type: "DRIVER" }))).toBe("driver");
    expect(resolveNavRole(makeUser({ account_type: "PRIVATE_HIRE_COMPANY" }))).toBe("company");
    expect(resolveNavRole(makeUser({ is_staff: true, account_type: "DRIVER" }))).toBe("admin");
  });

  it("returns 5 role-specific bottom nav buttons for every role", () => {
    const guest = getBottomNavItems(null);
    expect(guest).toHaveLength(5);
    expect(guest.map((i) => i.href)).toEqual([
      "/",
      "/transport/",
      "/companies/",
      "/contact/",
      "/login/",
    ]);

    const customer = getBottomNavItems(makeUser());
    expect(customer).toHaveLength(5);
    expect(customer.map((i) => i.href)).toEqual([
      "/",
      "/transport/",
      "/trips/",
      "/bookings/",
      "/profile/",
    ]);

    const driver = getBottomNavItems(makeUser({ account_type: "DRIVER" }));
    expect(driver).toHaveLength(5);
    expect(driver.map((i) => i.href)).toEqual([
      "/driver/dashboard/",
      "/driver/bookings/",
      "/driver/trips/",
      "/driver/vehicle/",
      "/profile/",
    ]);

    const company = getBottomNavItems(
      makeUser({
        account_type: "PRIVATE_HIRE_COMPANY",
        company: { id: 7, name: "Infaan Ltd", slug: "infaan-ltd" },
      }),
    );
    expect(company).toHaveLength(5);
    expect(company.map((i) => i.href)).toEqual([
      "/company/dashboard/",
      "/company/private-hire/",
      "/company/trips/",
      "/company/bookings/",
      "/company/profile/",
    ]);

    const admin = getBottomNavItems(makeUser({ is_staff: true }));
    expect(admin).toHaveLength(5);
    expect(admin.map((i) => i.href)).toEqual([
      "/admin/dashboard/",
      "/admin/companies/",
      "/admin/bookings/",
      "/admin/users/",
      "/admin/settings/",
    ]);
  });

  it("does not expose login-walled /trips/ or /bookings/ to guests in sidebar or bottom nav", () => {
    const guestBottom = getBottomNavItems(null).map((i) => i.href);
    const guestSidebar = getSidebarNavItems(null).map((i) => i.href);
    expect(guestBottom).not.toContain("/trips/");
    expect(guestBottom).not.toContain("/bookings/");
    expect(guestSidebar).not.toContain("/trips/");
    expect(guestSidebar).not.toContain("/bookings/");
  });

  it("maps role home and profile hrefs cleanly", () => {
    const companyWithOrg = makeUser({
      account_type: "PRIVATE_HIRE_COMPANY",
      company: { id: 1, name: "Zanzibar Co", slug: "zanzibar-co" },
    });
    const companyUnassigned = makeUser({ account_type: "PRIVATE_HIRE_COMPANY", company: null });

    expect(getRoleHomeHref(null)).toBe("/");
    expect(getRoleHomeHref(makeUser())).toBe("/");
    expect(getRoleHomeHref(makeUser({ account_type: "DRIVER" }))).toBe("/driver/dashboard/");
    expect(getRoleHomeHref(companyWithOrg)).toBe("/company/dashboard/");
    expect(getRoleHomeHref(companyUnassigned)).toBe("/settings/");
    expect(getRoleHomeHref(makeUser({ is_staff: true }))).toBe("/admin/dashboard/");

    expect(getRoleProfileHref(null)).toBe("/login/");
    expect(getRoleProfileHref(makeUser())).toBe("/profile/");
    expect(getRoleProfileHref(companyWithOrg)).toBe("/company/profile/");
    expect(getRoleProfileHref(companyUnassigned)).toBe("/settings/");
    expect(getRoleProfileHref(makeUser({ is_staff: true }))).toBe("/admin/settings/");
  });

  it("matches active routes reliably regardless of trailing slashes and nested sub-routes", () => {
    expect(normalizePathname("/transport/")).toBe("/transport");
    expect(normalizePathname("/")).toBe("/");

    const driverItems = getBottomNavItems(makeUser({ account_type: "DRIVER" }));
    const driverTrips = driverItems.find((i) => i.href === "/driver/trips/")!;
    expect(isNavItemActive("/driver/trips", driverTrips)).toBe(true);
    expect(isNavItemActive("/driver/trips/", driverTrips)).toBe(true);
    expect(isNavItemActive("/driver/pickup/", driverTrips)).toBe(true);
    expect(isNavItemActive("/driver/finalize/", driverTrips)).toBe(true);
    expect(isNavItemActive("/driver/bookings/", driverTrips)).toBe(false);

    const companyItems = getBottomNavItems(
      makeUser({
        account_type: "PRIVATE_HIRE_COMPANY",
        company: { id: 1, name: "Infaan", slug: "infaan" },
      }),
    );
    const fleetItem = companyItems.find((i) => i.href === "/company/private-hire/")!;
    expect(isNavItemActive("/company/private-service/", fleetItem)).toBe(true);
    expect(isNavItemActive("/company/private-driver/", fleetItem)).toBe(true);

    const guestItems = getBottomNavItems(null);
    const supportItem = guestItems.find((i) => i.href === "/contact/")!;
    expect(isNavItemActive("/support/", supportItem)).toBe(true);
    expect(isNavItemActive("/request/company/", supportItem)).toBe(true);
    expect(isNavItemActive("/request/driver/", supportItem)).toBe(true);
  });
});
