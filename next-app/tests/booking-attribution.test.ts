import { describe, expect, it } from "vitest";
import { deriveBookingAttribution } from "@/lib/booking-attribution";

describe("booking attribution", () => {
  it("snapshots a company-owned tour from server-loaded data", () => {
    expect(
      deriveBookingAttribution({
        title: "Stone Town Walking Tour",
        companyId: 7,
        company: { name: "Travel Island Demo" },
      }),
    ).toEqual({
      companyId: 7,
      companyNameSnapshot: "Travel Island Demo",
      tourTitleSnapshot: "Stone Town Walking Tour",
    });
  });

  it("keeps legacy unowned tours unassigned but preserves their title", () => {
    expect(
      deriveBookingAttribution({
        title: "Test Safari",
        companyId: null,
        company: null,
      }),
    ).toEqual({
      companyId: null,
      companyNameSnapshot: null,
      tourTitleSnapshot: "Test Safari",
    });
  });
});
