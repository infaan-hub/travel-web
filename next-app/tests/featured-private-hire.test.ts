import { describe, expect, it } from "vitest";
import {
  selectTopCompanyPrivateHireServices,
  type CompanyPerformanceStats,
  type FeaturedServiceCandidate,
} from "@/lib/featured-private-hire";

function makeCandidate(
  serviceId: number,
  companyId: number | null,
  serviceBookingsCount = 0,
  createdAtMs = 1_000,
): FeaturedServiceCandidate<{ id: number; companyId: number | null }> {
  return {
    service: { id: serviceId, companyId },
    serviceId,
    companyId,
    serviceBookingsCount,
    createdAtMs,
  };
}

describe("selectTopCompanyPrivateHireServices", () => {
  it("picks strictly 1 service per company and caps results at 4", () => {
    const candidates = [
      makeCandidate(1, 10, 2, 100),
      makeCandidate(2, 10, 9, 200), // best service for company 10
      makeCandidate(3, 20, 4, 300),
      makeCandidate(4, 30, 5, 400),
      makeCandidate(5, 40, 1, 500),
      makeCandidate(6, 50, 3, 600),
    ];

    const stats = new Map<number, CompanyPerformanceStats>([
      [10, { averageRating: 4.9, reviewCount: 12, bookingsCount: 18 }],
      [20, { averageRating: 4.7, reviewCount: 8, bookingsCount: 25 }],
      [30, { averageRating: 5.0, reviewCount: 5, bookingsCount: 10 }],
      [40, { averageRating: 4.2, reviewCount: 3, bookingsCount: 4 }],
      [50, { averageRating: null, reviewCount: 0, bookingsCount: 2 }],
    ]);

    const result = selectTopCompanyPrivateHireServices(candidates, stats, 4);
    expect(result).toHaveLength(4);
    // Distinct companies only
    expect(new Set(result.map((r) => r.service.companyId)).size).toBe(4);
    // Top 4 companies ordered by combined rating + booking volume: 20 (185.4), 10 (154.8), 30 (112.5), 40 (71.9)
    expect(result.map((r) => r.service.companyId)).toEqual([20, 10, 30, 40]);
    // Company 10 uses its most-booked service (id=2), not id=1
    const c10 = result.find((r) => r.service.companyId === 10);
    expect(c10?.service.id).toBe(2);
  });

  it("does not duplicate a single company when fewer than 4 companies exist", () => {
    const candidates = [
      makeCandidate(1, 10, 1, 100),
      makeCandidate(2, 10, 6, 200),
      makeCandidate(3, 20, 3, 150),
    ];

    const stats = new Map<number, CompanyPerformanceStats>([
      [10, { averageRating: 4.8, reviewCount: 4, bookingsCount: 7 }],
      [20, { averageRating: null, reviewCount: 0, bookingsCount: 3 }],
    ]);

    const result = selectTopCompanyPrivateHireServices(candidates, stats, 4);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.service.id)).toEqual([2, 3]);
  });

  it("ranks highly booked companies ahead of unrated zero-booking companies", () => {
    const candidates = [
      makeCandidate(1, 10, 0, 500),
      makeCandidate(2, 20, 12, 100),
      makeCandidate(3, 30, 0, 900),
    ];

    const stats = new Map<number, CompanyPerformanceStats>([
      [10, { averageRating: null, reviewCount: 0, bookingsCount: 0 }],
      [20, { averageRating: null, reviewCount: 0, bookingsCount: 12 }],
      [30, { averageRating: 4.9, reviewCount: 2, bookingsCount: 1 }],
    ]);

    const result = selectTopCompanyPrivateHireServices(candidates, stats, 4);
    // Company 30 (rating 4.9 * 12 + 1 + 5 = 64.8) and Company 20 (12 * 5 = 60) both beat Company 10 (0)
    expect(result.map((r) => r.service.companyId)).toEqual([30, 20, 10]);
  });
});
