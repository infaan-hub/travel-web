import { describe, expect, it } from "vitest";
import {
  COMPANY_ACCOUNT_PERMISSIONS,
  hasCompanyPermission,
} from "@/lib/company-account-access";

describe("single company account permissions", () => {
  it("grants company workspace capabilities without member management", () => {
    expect(COMPANY_ACCOUNT_PERMISSIONS).toContain("dashboard:read");
    expect(COMPANY_ACCOUNT_PERMISSIONS).toContain("profile:update");
    expect(COMPANY_ACCOUNT_PERMISSIONS).not.toContain("members:manage");
    expect(hasCompanyPermission("dashboard:read")).toBe(true);
  });
});
