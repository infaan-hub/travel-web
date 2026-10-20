import { describe, expect, it } from "vitest";
import { paginationFrom } from "@/lib/api/pagination";
import { getImageUrl } from "@/lib/utils/image-url";

describe("legacy pagination", () => {
  it("returns a raw array by default", () => {
    expect(paginationFrom(new URLSearchParams())).toBeNull();
  });

  it("calculates offsets when page is requested", () => {
    const result = paginationFrom(new URLSearchParams("page=3&page_size=10"));
    expect(result).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });
});

describe("image URL compatibility", () => {
  it("rewrites legacy Django media URLs", () => {
    expect(getImageUrl("http://localhost:8000/media/tours/a.jpg")).toBe("/uploads/tours/a.jpg");
    expect(getImageUrl("/media/tours/a.jpg")).toBe("/uploads/tours/a.jpg");
    expect(getImageUrl("tours/a.jpg")).toBe("/uploads/tours/a.jpg");
  });

  it("keeps new storage URLs intact", () => {
    expect(getImageUrl("/uploads/tours/a.jpg")).toBe("/uploads/tours/a.jpg");
    expect(getImageUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });

  it("returns a placeholder for missing images", () => {
    expect(getImageUrl(null)).toContain("data:image/svg+xml");
  });
});
