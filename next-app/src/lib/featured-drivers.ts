export type PublicDriverCompany = {
  id: number;
  name: string;
  slug: string;
  public_path: string;
  logo_image_url: string | null;
};

export type PublicDriverVehicle = {
  id: number;
  name: string;
  category: string;
  capacity: number;
  luggage_capacity: number;
  front_image_url: string | null;
};

/**
 * Privacy-safe public representation of an active driver.
 * Intentionally omits sensitive identity credentials (licenseNumber, idType,
 * idNumber) and private contact details (email, phone).
 */
export type PublicDriverCard = {
  id: number;
  name: string;
  image_url: string | null;
  is_public: boolean;
  company: PublicDriverCompany | null;
  vehicle: PublicDriverVehicle | null;
  service_id: number | null;
  trips_count: number;
  average_rating: number | null;
  review_count: number;
};

export type DriverRankingCandidate = {
  card: PublicDriverCard;
  createdAtMs: number;
};

export function computeDriverPerformanceScore(card: PublicDriverCard): number {
  const ratingScore =
    card.review_count > 0 &&
    card.average_rating != null &&
    Number.isFinite(card.average_rating)
      ? card.average_rating * 12 + Math.min(card.review_count, 25) * 0.5
      : 0;
  const tripsScore = Math.max(0, card.trips_count) * 5;
  const profileCompleteness =
    (card.image_url ? 1.5 : 0) + (card.vehicle ? 1 : 0);
  return ratingScore + tripsScore + profileCompleteness;
}

/**
 * Ranks public drivers by customer ratings and trip volume (most-booked &
 * top-rated drivers first) and optionally slices to `limit`.
 */
export function rankPublicDrivers(
  candidates: readonly DriverRankingCandidate[],
  limit?: number,
): PublicDriverCard[] {
  const sorted = [...candidates]
    .map((entry) => ({
      entry,
      score: computeDriverPerformanceScore(entry.card),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aRating = a.entry.card.average_rating ?? 0;
      const bRating = b.entry.card.average_rating ?? 0;
      if (bRating !== aRating) return bRating - aRating;
      if (b.entry.card.trips_count !== a.entry.card.trips_count) {
        return b.entry.card.trips_count - a.entry.card.trips_count;
      }
      if (b.entry.card.review_count !== a.entry.card.review_count) {
        return b.entry.card.review_count - a.entry.card.review_count;
      }
      if (b.entry.createdAtMs !== a.entry.createdAtMs) {
        return b.entry.createdAtMs - a.entry.createdAtMs;
      }
      return b.entry.card.id - a.entry.card.id;
    });

  const sliced =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0
      ? sorted.slice(0, Math.floor(limit))
      : sorted;

  return sliced.map((item) => item.entry.card);
}
