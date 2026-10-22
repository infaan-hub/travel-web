import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * A company-owned tour only has public presence while its company is active
 * and the tour itself is published. Legacy unowned tours (companyId = null)
 * remain visible as before.
 */
export const PUBLIC_TOUR_VISIBILITY = {
  OR: [
    { companyId: null },
    {
      company: { is: { status: "ACTIVE" } },
      publicationStatus: "PUBLISHED",
    },
  ],
} satisfies Prisma.TourWhereInput;

export const PUBLIC_TOUR_WHERE = {
  deletedAt: null,
  AND: [PUBLIC_TOUR_VISIBILITY],
} satisfies Prisma.TourWhereInput;
