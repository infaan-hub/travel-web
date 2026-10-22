import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUS_LABELS,
  COMPANY_BOOKING_TRANSITIONS,
  COMPANY_EDITABLE_TOUR_STATUSES,
  COMPANY_PLATFORM_MANAGED_FIELDS,
  TOUR_PUBLICATION_LABELS,
  companyBookingTransitions,
  isCompanyBookingTransitionAllowed,
  isCompanyEditableTourStatus,
} from "@/lib/company-operations";

describe("company booking operations", () => {
  it("only permits one-way booking transitions", () => {
    expect(companyBookingTransitions("pending")).toEqual([
      "confirmed",
      "cancelled",
    ]);
    expect(companyBookingTransitions("confirmed")).toEqual(["cancelled"]);
    expect(companyBookingTransitions("cancelled")).toEqual([]);
    expect(COMPANY_BOOKING_TRANSITIONS.cancelled).toEqual([]);
  });

  it("rejects reverse and skipped transitions", () => {
    expect(isCompanyBookingTransitionAllowed("pending", "confirmed")).toBe(true);
    expect(isCompanyBookingTransitionAllowed("pending", "cancelled")).toBe(true);
    expect(isCompanyBookingTransitionAllowed("confirmed", "cancelled")).toBe(
      true,
    );
    expect(isCompanyBookingTransitionAllowed("cancelled", "confirmed")).toBe(
      false,
    );
    expect(isCompanyBookingTransitionAllowed("cancelled", "pending")).toBe(
      false,
    );
    expect(isCompanyBookingTransitionAllowed("confirmed", "pending")).toBe(
      false,
    );
    expect(isCompanyBookingTransitionAllowed("pending", "pending")).toBe(true);
  });

  it("labels every booking status", () => {
    expect(BOOKING_STATUS_LABELS).toEqual({
      pending: "Pending",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
    });
  });
});

describe("company tour operations", () => {
  it("lets companies choose only operational publication states", () => {
    expect(COMPANY_EDITABLE_TOUR_STATUSES).toEqual([
      "DRAFT",
      "PUBLISHED",
      "ARCHIVED",
    ]);
    expect(isCompanyEditableTourStatus("DRAFT")).toBe(true);
    expect(isCompanyEditableTourStatus("PUBLISHED")).toBe(true);
    expect(isCompanyEditableTourStatus("ARCHIVED")).toBe(true);
    expect(isCompanyEditableTourStatus("PENDING_REVIEW")).toBe(false);
    expect(isCompanyEditableTourStatus("REJECTED")).toBe(false);
    expect(isCompanyEditableTourStatus("published")).toBe(false);
    expect(isCompanyEditableTourStatus(null)).toBe(false);
  });

  it("labels platform moderation states", () => {
    expect(TOUR_PUBLICATION_LABELS).toEqual({
      DRAFT: "Draft",
      PENDING_REVIEW: "Pending review",
      PUBLISHED: "Published",
      REJECTED: "Rejected",
      ARCHIVED: "Archived",
    });
  });

  it("keeps platform-managed company fields out of company editing", () => {
    expect(COMPANY_PLATFORM_MANAGED_FIELDS).toEqual([
      "name",
      "slug",
      "registration_reference",
      "business_type",
      "status",
      "is_public",
    ]);
  });
});
