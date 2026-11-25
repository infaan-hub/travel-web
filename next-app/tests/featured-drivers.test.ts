import { describe, expect, it } from "vitest";
import {
  rankPublicDrivers,
  type DriverRankingCandidate,
  type PublicDriverCard,
} from "@/lib/featured-drivers";

function makeDriverCandidate(
  overrides: Partial<PublicDriverCard> & { id: number; name: string },
  createdAtMs = 1_000,
): DriverRankingCandidate {
  const card: PublicDriverCard = {
    image_url: null,
    is_public: false,
    company: null,
    vehicle: null,
    service_id: null,
    trips_count: 0,
    average_rating: null,
    review_count: 0,
    ...overrides,
  };
  return { card, createdAtMs };
}

describe("rankPublicDrivers", () => {
  it("ranks top drivers by ratings and trip count and respects limit=4", () => {
    const candidates = [
      makeDriverCandidate({ id: 1, name: "Driver A", trips_count: 3, average_rating: 4.5, review_count: 2 }),
      makeDriverCandidate({ id: 2, name: "Driver B", trips_count: 20, average_rating: 4.9, review_count: 10 }),
      makeDriverCandidate({ id: 3, name: "Driver C", trips_count: 12, average_rating: null, review_count: 0 }),
      makeDriverCandidate({ id: 4, name: "Driver D", trips_count: 8, average_rating: 5.0, review_count: 4 }),
      makeDriverCandidate({ id: 5, name: "Driver E", trips_count: 1, average_rating: null, review_count: 0 }),
    ];

    const topFour = rankPublicDrivers(candidates, 4);
    expect(topFour).toHaveLength(4);
    expect(topFour.map((d) => d.id)).toEqual([2, 4, 1, 3]);
  });

  it("never exposes sensitive driver credentials (ID or license numbers)", () => {
    const [driver] = rankPublicDrivers(
      [makeDriverCandidate({ id: 7, name: "Abdulrahim Hamid", is_public: true, trips_count: 5 })],
      4,
    );
    const keys = Object.keys(driver);
    expect(keys).not.toContain("id_number");
    expect(keys).not.toContain("idNumber");
    expect(keys).not.toContain("id_type");
    expect(keys).not.toContain("idType");
    expect(keys).not.toContain("license_number");
    expect(keys).not.toContain("licenseNumber");
    expect(keys).not.toContain("phone");
    expect(keys).not.toContain("email");
  });
});
