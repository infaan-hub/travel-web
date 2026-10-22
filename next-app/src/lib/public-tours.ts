import "server-only";
import type { Prisma } from "@prisma/client";

/**
 * A tour is public only when its owning company is active and the tour has
 * been explicitly published. Unassigned legacy tours remain private until an
 * administrator assigns them to a company and approves publication.
 */
export const PUBLIC_TOUR_VISIBILITY = {
  company: { is: { status: "ACTIVE" } },
  publicationStatus: "PUBLISHED",
} satisfies Prisma.TourWhereInput;

export const PUBLIC_TOUR_WHERE = {
  deletedAt: null,
  AND: [PUBLIC_TOUR_VISIBILITY],
} satisfies Prisma.TourWhereInput;
