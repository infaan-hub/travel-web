export type CompanyPerformanceStats = {
  averageRating: number | null;
  reviewCount: number;
  bookingsCount: number;
};

export type FeaturedServiceCandidate<T> = {
  service: T;
  serviceId: number;
  companyId: number | null;
  serviceBookingsCount: number;
  createdAtMs: number;
};

export type RankedFeaturedService<T> = {
  service: T;
  companyStats: CompanyPerformanceStats;
  score: number;
};

const EMPTY_STATS: CompanyPerformanceStats = {
  averageRating: null,
  reviewCount: 0,
  bookingsCount: 0,
};

/**
 * Scores a company using both approved customer ratings and non-cancelled
 * private-hire booking volume so top-rated and most-booked companies rise first.
 */
export function computeCompanyPerformanceScore(stats: CompanyPerformanceStats): number {
  const ratingScore =
    stats.reviewCount > 0 &&
    stats.averageRating != null &&
    Number.isFinite(stats.averageRating)
      ? stats.averageRating * 12 + Math.min(stats.reviewCount, 25) * 0.5
      : 0;
  const bookingsScore = Math.max(0, stats.bookingsCount) * 5;
  return ratingScore + bookingsScore;
}

function compareServiceCandidates<T>(
  a: FeaturedServiceCandidate<T>,
  b: FeaturedServiceCandidate<T>,
): number {
  if (b.serviceBookingsCount !== a.serviceBookingsCount) {
    return b.serviceBookingsCount - a.serviceBookingsCount;
  }
  if (b.createdAtMs !== a.createdAtMs) {
    return b.createdAtMs - a.createdAtMs;
  }
  return b.serviceId - a.serviceId;
}

/**
 * Picks up to `limit` (default 4) private-hire services — strictly 1 service
 * per distinct company — ordered by top-rated and most-booked companies first.
 * Within each company, selects its most-booked (then newest) active service.
 */
export function selectTopCompanyPrivateHireServices<T>(
  candidates: readonly FeaturedServiceCandidate<T>[],
  companyStatsById: ReadonlyMap<number, CompanyPerformanceStats>,
  limit = 4,
): RankedFeaturedService<T>[] {
  const maxItems = Math.max(1, Math.floor(limit));
  const bestByCompany = new Map<number, FeaturedServiceCandidate<T>>();

  for (const candidate of candidates) {
    if (candidate.companyId == null) continue;
    const existing = bestByCompany.get(candidate.companyId);
    if (!existing || compareServiceCandidates(candidate, existing) < 0) {
      bestByCompany.set(candidate.companyId, candidate);
    }
  }

  // Fallback only when no company-linked services exist at all.
  if (bestByCompany.size === 0) {
    return [...candidates]
      .sort(compareServiceCandidates)
      .slice(0, maxItems)
      .map((candidate) => ({
        service: candidate.service,
        companyStats: {
          averageRating: null,
          reviewCount: 0,
          bookingsCount: candidate.serviceBookingsCount,
        },
        score: candidate.serviceBookingsCount * 5,
      }));
  }

  const ranked = Array.from(bestByCompany.entries()).map(([companyId, candidate]) => {
    const raw = companyStatsById.get(companyId) ?? EMPTY_STATS;
    const companyStats: CompanyPerformanceStats = {
      averageRating:
        raw.averageRating != null && Number.isFinite(raw.averageRating)
          ? Math.round(raw.averageRating * 10) / 10
          : null,
      reviewCount: Math.max(0, raw.reviewCount),
      bookingsCount: Math.max(0, raw.bookingsCount),
    };
    return {
      candidate,
      companyStats,
      score: computeCompanyPerformanceScore(companyStats),
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aRating = a.companyStats.averageRating ?? 0;
    const bRating = b.companyStats.averageRating ?? 0;
    if (bRating !== aRating) return bRating - aRating;
    if (b.companyStats.bookingsCount !== a.companyStats.bookingsCount) {
      return b.companyStats.bookingsCount - a.companyStats.bookingsCount;
    }
    if (b.companyStats.reviewCount !== a.companyStats.reviewCount) {
      return b.companyStats.reviewCount - a.companyStats.reviewCount;
    }
    return compareServiceCandidates(a.candidate, b.candidate);
  });

  return ranked.slice(0, maxItems).map((entry) => ({
    service: entry.candidate.service,
    companyStats: entry.companyStats,
    score: entry.score,
  }));
}
