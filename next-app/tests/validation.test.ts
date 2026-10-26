import { describe, expect, it } from "vitest";
import {
  bookingCreateSchema,
  contactSchema,
  itemsListSchema,
  bookingUpdateSchema,
  hotelUpdateSchema,
  reviewCreateSchema,
  workspaceCreateSchema,
  workspaceUpdateSchema,
  workspaceTaskUpdateSchema,
} from "@/lib/validation/schemas";

describe("validation compatibility", () => {
  it("accepts a booking without optional geolocation fields", () => {
    const result = bookingCreateSchema.parse({
      tour: "46",
      full_name: "Jane Doe",
      email: "jane@example.com",
      phone: "255700000000",
      travelers: "2",
      travel_date: "2026-11-10",
    });
    expect(result.tour).toBe(46);
    expect(result.travelers).toBe(2);
    expect(result.user_lat).toBeUndefined();
    expect(result.user_lng).toBeUndefined();
    expect(result.distance_km).toBeUndefined();
    expect(result.estimated_time_mins).toBeUndefined();
  });

  it("accepts a review without a tour", () => {
    const result = reviewCreateSchema.parse({ rating: 5, content: "Excellent" });
    expect(result.tour).toBeUndefined();
  });

  it("accepts a workspace payload with omitted optional relations", () => {
    const result = workspaceCreateSchema.parse({
      tourist_name: "Walk-in guest",
      total_price: "250.50",
    });
    expect(result.selected_tours).toEqual([]);
    expect(result.selected_rooms).toEqual([]);
    expect(result.total_price).toBe(250.5);
  });

  it("does not inject create-time defaults into partial workspace updates", () => {
    const result = workspaceUpdateSchema.parse({ notes: "Updated" });
    expect(result.notes).toBe("Updated");
    expect(result.tourist).toBeUndefined();
    expect(result.selected_tours).toBeUndefined();
    expect(result.selected_rooms).toBeUndefined();
    expect(result.total_price).toBeUndefined();
  });

  it("keeps all partial update schemas free of create-time defaults", () => {
    expect(bookingUpdateSchema.parse({ status: "cancelled" }).notes).toBeUndefined();
    expect(bookingUpdateSchema.parse({ status: "cancelled" }).address).toBeUndefined();
    expect(hotelUpdateSchema.parse({ name: "New" }).phone).toBeUndefined();
    expect(workspaceTaskUpdateSchema.parse({ title: "New" }).description).toBeUndefined();
  });

  it("parses legacy JSON and comma-separated includes", () => {
    expect(itemsListSchema.parse('["Hotel","Guide"]')).toEqual(["Hotel", "Guide"]);
    expect(itemsListSchema.parse("Hotel, Guide, Meals")).toEqual(["Hotel", "Guide", "Meals"]);
  });

  it("rejects invalid contact email addresses", () => {
    const result = contactSchema.safeParse({
      name: "A",
      email: "not-an-email",
      subject: "Hello",
      message: "World",
    });
    expect(result.success).toBe(false);
  });
});
