import { describe, expect, it } from "vitest";
import {
  canCompanyBePublic,
  companySlugCandidate,
  coordinatePairIssue,
  hasCompleteCoordinates,
  nextCompanyStatus,
  normalizeCompanySlug,
  openStreetMapUrl,
  publicCompanyPath,
} from "@/lib/company-domain";

describe("company domain", () => {
  it("normalizes company names into URL-safe slugs", () => {
    expect(normalizeCompanySlug("  Zanzibar & Safari Tours! ")).toBe(
      "zanzibar-safari-tours",
    );
    expect(normalizeCompanySlug("Café — Kilimani")).toBe("cafe-kilimani");
    expect(normalizeCompanySlug("A---B")).toBe("a-b");
  });

  it("bounds generated slugs and adds deterministic suffixes", () => {
    const base = normalizeCompanySlug("a ".repeat(120));
    expect(base.length).toBeLessThanOrEqual(80);
    const suffix = companySlugCandidate(base, 12);
    expect(suffix.endsWith("-12")).toBe(true);
    expect(suffix.length).toBeLessThanOrEqual(80);
    expect(companySlugCandidate("acme", 1)).toBe("acme");
  });

  it("allows only the documented lifecycle transitions", () => {
    expect(nextCompanyStatus("PENDING", "activate")).toBe("ACTIVE");
    expect(nextCompanyStatus("PENDING", "suspend")).toBeNull();
    expect(nextCompanyStatus("ACTIVE", "suspend")).toBe("SUSPENDED");
    expect(nextCompanyStatus("SUSPENDED", "reactivate")).toBe("ACTIVE");
    expect(nextCompanyStatus("SUSPENDED", "activate")).toBeNull();
    expect(nextCompanyStatus("ARCHIVED", "reactivate")).toBeNull();
    expect(nextCompanyStatus("ACTIVE", "archive")).toBe("ARCHIVED");
    expect(nextCompanyStatus("PENDING", "archive")).toBe("ARCHIVED");
    expect(nextCompanyStatus("PENDING", "reject")).toBe("REJECTED");
    expect(nextCompanyStatus("ACTIVE", "reject")).toBeNull();
  });

  it("requires active status before a company can be public", () => {
    expect(canCompanyBePublic("ACTIVE")).toBe(true);
    expect(canCompanyBePublic("PENDING")).toBe(false);
    expect(canCompanyBePublic("SUSPENDED")).toBe(false);
    expect(canCompanyBePublic("ARCHIVED")).toBe(false);
  });

  it("validates coordinate pairs without inventing a location", () => {
    expect(coordinatePairIssue(null, null)).toBeNull();
    expect(coordinatePairIssue(-6.16, 39.2)).toBeNull();
    expect(coordinatePairIssue(-6.16, null)).toMatch(/both latitude and longitude/i);
    expect(coordinatePairIssue(91, 39.2)).toMatch(/valid latitude/i);
    expect(coordinatePairIssue(-6.16, 181)).toMatch(/valid latitude/i);
    expect(hasCompleteCoordinates(-6.16, 39.2)).toBe(true);
    expect(hasCompleteCoordinates(-6.16, null)).toBe(false);
  });

  it("builds stable public links", () => {
    expect(publicCompanyPath("acme-safaris")).toBe("/company/acme-safaris/");
    expect(openStreetMapUrl(-6.16, 39.2)).toContain("mlat=-6.16");
    expect(openStreetMapUrl(-6.16, 39.2)).toContain("mlon=39.2");
  });
});
