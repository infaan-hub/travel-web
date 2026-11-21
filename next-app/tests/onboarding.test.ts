import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPANY_ONBOARDING_SLIDES,
  CUSTOMER_ONBOARDING_SLIDES,
  DRIVER_ONBOARDING_SLIDES,
} from "@/features/onboarding/onboarding-slides";
import {
  getPendingRoleOnboardingPath,
  isCompanyOnboardingComplete,
  isCustomerOnboardingComplete,
  isDriverOnboardingComplete,
  isOnboardingRoute,
  markCompanyOnboardingComplete,
  markCustomerOnboardingComplete,
  markDriverOnboardingComplete,
  postLoginPath,
} from "@/lib/onboarding";

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

function installMemoryStorage() {
  const createStore = () => {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => {
        map.set(key, String(value));
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => map.clear(),
      key: (index: number) => Array.from(map.keys())[index] ?? null,
      get length() {
        return map.size;
      },
    };
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: createStore(),
      sessionStorage: createStore(),
    },
  });
}

describe("onboarding slide decks & real captured screenshot assets", () => {
  it("provides the exact required slide counts for customer (3), company (5), and driver (5)", () => {
    expect(CUSTOMER_ONBOARDING_SLIDES).toHaveLength(3);
    expect(COMPANY_ONBOARDING_SLIDES).toHaveLength(5);
    expect(DRIVER_ONBOARDING_SLIDES).toHaveLength(5);
  });

  it("ships real captured non-empty screenshot assets on disk for every shot in every slide", () => {
    const allSlides = [
      ...CUSTOMER_ONBOARDING_SLIDES,
      ...COMPANY_ONBOARDING_SLIDES,
      ...DRIVER_ONBOARDING_SLIDES,
    ];

    let totalShots = 0;
    for (const slide of allSlides) {
      expect(slide.shots.length).toBeGreaterThanOrEqual(3);
      for (const shot of slide.shots) {
        totalShots += 1;
        expect(shot.src.startsWith("/onboarding/")).toBe(true);
        const filePath = path.join(PUBLIC_DIR, shot.src.replace(/^\//, ""));
        expect(existsSync(filePath), `Missing onboarding shot: ${shot.src}`).toBe(true);
        expect(statSync(filePath).size).toBeGreaterThan(2000);
      }
    }
    expect(totalShots).toBeGreaterThanOrEqual(40);
  });
});

describe("installed-app first-time role onboarding routing", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it("recognizes all three onboarding routes with or without trailing slashes", () => {
    expect(isOnboardingRoute("/onboarding")).toBe(true);
    expect(isOnboardingRoute("/onboarding/")).toBe(true);
    expect(isOnboardingRoute("/company/onboarding")).toBe(true);
    expect(isOnboardingRoute("/company/onboarding/")).toBe(true);
    expect(isOnboardingRoute("/driver/onboarding")).toBe(true);
    expect(isOnboardingRoute("/driver/onboarding/")).toBe(true);
    expect(isOnboardingRoute("/")).toBe(false);
    expect(isOnboardingRoute("/company/dashboard/")).toBe(false);
    expect(isOnboardingRoute("/driver/dashboard/")).toBe(false);
  });

  it("redirects first-time installed-app customers & guests to /onboarding/", () => {
    expect(isCustomerOnboardingComplete()).toBe(false);

    expect(
      getPendingRoleOnboardingPath(null, { isInstalledApp: true, currentPath: "/" }),
    ).toBe("/onboarding/?from=%2F");

    expect(
      getPendingRoleOnboardingPath(
        { id: 10, is_staff: false, account_type: "CUSTOMER" },
        { isInstalledApp: true, currentPath: "/transport/" },
      ),
    ).toBe("/onboarding/?from=%2Ftransport%2F");

    // Non-installed regular browser does not force redirect
    expect(
      getPendingRoleOnboardingPath(null, { isInstalledApp: false, currentPath: "/" }),
    ).toBeNull();

    markCustomerOnboardingComplete();
    expect(isCustomerOnboardingComplete()).toBe(true);
    expect(
      getPendingRoleOnboardingPath(null, { isInstalledApp: true, currentPath: "/" }),
    ).toBeNull();
  });

  it("routes first-time installed-app company logins to /company/onboarding/ once per user", () => {
    const companyUser = { id: 42, is_staff: false, account_type: "PRIVATE_HIRE_COMPANY" };
    expect(isCompanyOnboardingComplete(42)).toBe(false);

    expect(postLoginPath(companyUser, "/", { isInstalledApp: true })).toBe(
      "/company/onboarding/",
    );
    expect(
      getPendingRoleOnboardingPath(companyUser, {
        isInstalledApp: true,
        currentPath: "/company/dashboard/",
      }),
    ).toBe("/company/onboarding/");

    // Non-installed browser goes straight to dashboard
    expect(postLoginPath(companyUser, "/", { isInstalledApp: false })).toBe(
      "/company/dashboard/",
    );

    markCompanyOnboardingComplete(42);
    expect(isCompanyOnboardingComplete(42)).toBe(true);
    expect(postLoginPath(companyUser, "/", { isInstalledApp: true })).toBe(
      "/company/dashboard/",
    );
    expect(
      getPendingRoleOnboardingPath(companyUser, {
        isInstalledApp: true,
        currentPath: "/company/dashboard/",
      }),
    ).toBeNull();
  });

  it("routes first-time installed-app driver logins to /driver/onboarding/ once per user", () => {
    const driverUser = { id: 77, is_staff: false, account_type: "DRIVER" };
    expect(isDriverOnboardingComplete(77)).toBe(false);

    expect(postLoginPath(driverUser, "/", { isInstalledApp: true })).toBe(
      "/driver/onboarding/",
    );
    expect(
      getPendingRoleOnboardingPath(driverUser, {
        isInstalledApp: true,
        currentPath: "/driver/dashboard/",
      }),
    ).toBe("/driver/onboarding/");

    // Non-installed browser goes straight to dashboard
    expect(postLoginPath(driverUser, "/", { isInstalledApp: false })).toBe(
      "/driver/dashboard/",
    );

    markDriverOnboardingComplete(77);
    expect(isDriverOnboardingComplete(77)).toBe(true);
    expect(postLoginPath(driverUser, "/", { isInstalledApp: true })).toBe(
      "/driver/dashboard/",
    );
    expect(
      getPendingRoleOnboardingPath(driverUser, {
        isInstalledApp: true,
        currentPath: "/driver/dashboard/",
      }),
    ).toBeNull();
  });

  it("never redirects admins or interrupts active auth/onboarding screens", () => {
    const admin = { id: 1, is_staff: true, account_type: "CUSTOMER" };
    expect(
      getPendingRoleOnboardingPath(admin, {
        isInstalledApp: true,
        currentPath: "/admin/dashboard/",
      }),
    ).toBeNull();
    expect(postLoginPath(admin, "/", { isInstalledApp: true })).toBe("/admin/dashboard/");

    expect(
      getPendingRoleOnboardingPath(null, {
        isInstalledApp: true,
        currentPath: "/verify-email/",
      }),
    ).toBeNull();
    expect(
      getPendingRoleOnboardingPath(null, {
        isInstalledApp: true,
        currentPath: "/onboarding/",
      }),
    ).toBeNull();
  });
});
