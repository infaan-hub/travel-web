import { describe, expect, it } from "vitest";
import {
  companyBookingStatusUpdateSchema,
  companyCreateSchema,
  companyMemberAssignSchema,
  companyTourCreateSchema,
  companyTourUpdateSchema,
  companyTripCreateSchema,
  companyTripUpdateSchema,
  companyUpdateSchema,
  companyWorkspaceProfileUpdateSchema,
} from "@/lib/validation/company";

describe("company validation", () => {
  it("validates and parses a weekly company opening schedule", () => {
    const schedule = {
      monday: { is_open: true, opens_at: "09:00", closes_at: "17:00" },
      tuesday: { is_open: false, opens_at: null, closes_at: null },
      wednesday: { is_open: false, opens_at: null, closes_at: null },
      thursday: { is_open: false, opens_at: null, closes_at: null },
      friday: { is_open: false, opens_at: null, closes_at: null },
      saturday: { is_open: false, opens_at: null, closes_at: null },
      sunday: { is_open: false, opens_at: null, closes_at: null },
    };
    const parsed = companyCreateSchema.safeParse({
      name: "Acme Safaris",
      opening_hours: JSON.stringify(schedule),
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.opening_hours).toEqual(schedule);

    expect(
      companyCreateSchema.safeParse({
        name: "Acme Safaris",
        opening_hours: JSON.stringify({
          ...schedule,
          monday: { is_open: true, opens_at: "17:00", closes_at: "09:00" },
        }),
      }).success,
    ).toBe(false);
    expect(
      companyCreateSchema.safeParse({
        name: "Acme Safaris",
        opening_hours: JSON.stringify({ monday: schedule.monday }),
      }).success,
    ).toBe(false);
  });

  it("accepts a legacy opening-hours string while old clients are phased out", () => {
    const parsed = companyCreateSchema.safeParse({
      name: "Acme Safaris",
      opening_hours: "Mon-Fri, 08:00-17:00",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.opening_hours).toBe("Mon-Fri, 08:00-17:00");
    }
  });

  it("applies safe defaults to a minimal company", () => {
    const result = companyCreateSchema.safeParse({
      name: "  Acme Safaris  ",
      contact_email: "",
      country: "",
      latitude: "-6.165917",
      longitude: "39.202641",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name).toBe("Acme Safaris");
    expect(result.data.contact_email).toBe("");
    expect(result.data.country).toBe("Tanzania");
    expect(result.data.business_type).toBe("TOUR_OPERATOR");
    expect(result.data.latitude).toBe(-6.165917);
    expect(result.data.longitude).toBe(39.202641);
  });

  it("rejects one-sided and out-of-range coordinates on create", () => {
    expect(
      companyCreateSchema.safeParse({ name: "Acme", latitude: "-6.1", longitude: "" })
        .success,
    ).toBe(false);
    expect(
      companyCreateSchema.safeParse({ name: "Acme", latitude: "91", longitude: "39" })
        .success,
    ).toBe(false);
    expect(
      companyCreateSchema.safeParse({ name: "Acme", latitude: "-6.1", longitude: "181" })
        .success,
    ).toBe(false);
  });

  it("validates names, emails, URLs and slugs", () => {
    expect(companyCreateSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(
      companyCreateSchema.safeParse({ name: "Acme", contact_email: "not-an-email" })
        .success,
    ).toBe(false);
    expect(
      companyCreateSchema.safeParse({ name: "Acme", website: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      companyCreateSchema.safeParse({ name: "Acme", slug: "x".repeat(121) }).success,
    ).toBe(false);
  });

  it("parses update visibility and social link JSON", () => {
    const result = companyUpdateSchema.safeParse({
      is_public: "on",
      social_links: JSON.stringify({
        instagram: "https://instagram.com/acme",
        ignored: "https://example.com",
      }),
    });
    expect(result.success).toBe(false);

    const valid = companyUpdateSchema.safeParse({
      is_public: "on",
      social_links: JSON.stringify({ instagram: "https://instagram.com/acme" }),
    });
    expect(valid.success).toBe(true);
    if (!valid.success) return;
    expect(valid.data.is_public).toBe(true);
    expect(valid.data.social_links).toEqual({
      instagram: "https://instagram.com/acme",
    });
  });

  it("rejects malformed social link payloads", () => {
    expect(companyUpdateSchema.safeParse({ social_links: "{not json" }).success).toBe(
      false,
    );
    expect(
      companyUpdateSchema.safeParse({
        social_links: JSON.stringify({ instagram: "not a url" }),
      }).success,
    ).toBe(false);
  });

  it("allows partial updates without manufacturing coordinates", () => {
    const result = companyUpdateSchema.safeParse({ name: "Renamed Company" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.latitude).toBeUndefined();
    expect(result.data.longitude).toBeUndefined();
  });

  it("validates membership payloads", () => {
    expect(companyMemberAssignSchema.safeParse({ user_id: "4", role: "MANAGER" }).success).toBe(
      true,
    );
    expect(companyMemberAssignSchema.safeParse({ user_id: 0, role: "OWNER" }).success).toBe(
      false,
    );
    expect(companyMemberAssignSchema.safeParse({ user_id: 4, role: "ADMIN" }).success).toBe(
      false,
    );
  });

  it("strips platform-managed fields from workspace profile updates", () => {
    const result = companyWorkspaceProfileUpdateSchema.safeParse({
      description: "Delegated description",
      contact_email: "hello@example.com",
      name: "Attempted rename",
      slug: "attempted-slug",
      registration_reference: "ATTEMPT",
      business_type: "OTHER",
      status: "SUSPENDED",
      is_public: false,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({ description: "Delegated description" });
    expect(result.data).not.toHaveProperty("name");
    expect(result.data).not.toHaveProperty("contact_email");
    expect(result.data).not.toHaveProperty("status");
    expect(result.data).not.toHaveProperty("is_public");
  });

  it("validates separate company trip listings", () => {
    const valid = companyTripCreateSchema.safeParse({
      title: "Stone Town Walk",
      place: "Stone Town",
      description: "A guided historic town walk.",
      price: "35.50",
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.price).toBe(35.5);

    expect(
      companyTripCreateSchema.safeParse({
        title: "",
        place: "Stone Town",
        price: "-5",
      }).success,
    ).toBe(false);
  });

  it("stores a map coordinate pair on a company trip", () => {
    const located = companyTripCreateSchema.safeParse({
      title: "Paje Beach Day",
      place: "Paje Beach, Paje",
      price: "45",
      latitude: "-6.265000",
      longitude: "39.532000",
    });
    expect(located.success).toBe(true);
    if (located.success) {
      expect(located.data.latitude).toBe(-6.265);
      expect(located.data.longitude).toBe(39.532);
    }

    expect(
      companyTripCreateSchema.safeParse({
        title: "Half a pin",
        place: "Paje",
        price: "45",
        latitude: "-6.265",
      }).success,
    ).toBe(false);

    const cleared = companyTripUpdateSchema.safeParse({
      latitude: "",
      longitude: "",
    });
    expect(cleared.success).toBe(true);
    if (cleared.success) {
      expect(cleared.data.latitude).toBeNull();
      expect(cleared.data.longitude).toBeNull();
    }

    const untouched = companyTripUpdateSchema.safeParse({ title: "Renamed" });
    expect(untouched.success).toBe(true);
    if (untouched.success) {
      expect(untouched.data.latitude).toBeUndefined();
      expect(untouched.data.longitude).toBeUndefined();
    }
  });

  it("validates company tour publication and itinerary payloads", () => {
    const base = {
      title: "Paje Beach Day",
      description: "A full-day tour.",
      price: "95.50",
      duration: "1 day",
      destination: "Paje",
      category: "zanzibar" as const,
    };
    const created = companyTourCreateSchema.safeParse({
      ...base,
      publication_status: "PUBLISHED",
      company_id: 999,
      itinerary: JSON.stringify([
        { day: 1, title: "Beach time", description: "Relax." },
      ]),
      includes: JSON.stringify(["Guide"]),
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    expect(created.data.publication_status).toBe("PUBLISHED");
    expect(created.data.max_travelers).toBe(10);
    expect(created.data.itinerary).toEqual([
      { day: 1, title: "Beach time", description: "Relax." },
    ]);
    expect(created.data).not.toHaveProperty("company_id");

    expect(
      companyTourCreateSchema.safeParse({
        ...base,
        publication_status: "PENDING_REVIEW",
      }).success,
    ).toBe(false);
    expect(
      companyTourCreateSchema.safeParse({
        ...base,
        destination_lat: "-6.1",
        destination_lng: "",
      }).success,
    ).toBe(false);
    expect(
      companyTourUpdateSchema.safeParse({ publication_status: "REJECTED" })
        .success,
    ).toBe(false);
    expect(
      companyTourUpdateSchema.safeParse({ available: false }).success,
    ).toBe(true);
  });

  it("only accepts operational booking status transitions", () => {
    expect(
      companyBookingStatusUpdateSchema.safeParse({ status: "confirmed" })
        .success,
    ).toBe(true);
    expect(
      companyBookingStatusUpdateSchema.safeParse({ status: "cancelled" })
        .success,
    ).toBe(true);
    expect(
      companyBookingStatusUpdateSchema.safeParse({ status: "pending" }).success,
    ).toBe(false);
    expect(
      companyBookingStatusUpdateSchema.safeParse({ status: "paid" }).success,
    ).toBe(false);
  });
});
