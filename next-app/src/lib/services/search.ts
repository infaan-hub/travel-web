import "server-only";
import prisma from "@/lib/db/prisma";
import {
  companyPublicSerializer,
  tipSerializer,
  tourListSerializer,
  type Json,
} from "@/lib/serializers";
import { PUBLIC_TOUR_VISIBILITY } from "@/lib/public-tours";

type RankedRow = { id: number; rank: number };

/**
 * Full-text search across tours and travel tips using the
 * PostgreSQL `tsvector` columns with GIN indexes.
 */
export async function searchContent(query: string): Promise<{
  tours: Json[];
  tips: Json[];
  companies: Json[];
}> {
  const trimmed = query.trim();
  if (!trimmed) return { tours: [], tips: [], companies: [] };

  const [tourRows, tipRows, companyRows] = await Promise.all([
    prisma.$queryRaw<RankedRow[]>`
      SELECT t.id, ts_rank(t.search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM tours t
       WHERE t.deleted_at IS NULL
         AND (
           t.company_id IS NULL
           OR (
             t.publication_status = 'PUBLISHED'
             AND EXISTS (
               SELECT 1 FROM companies c
                WHERE c.id = t.company_id AND c.status = 'ACTIVE'
             )
           )
         )
         AND t.search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
    prisma.$queryRaw<RankedRow[]>`
      SELECT id, ts_rank(search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM travel_tips
       WHERE deleted_at IS NULL
         AND search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
    prisma.$queryRaw<RankedRow[]>`
      SELECT id, ts_rank(search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM companies
       WHERE status = 'ACTIVE'
         AND is_public = true
         AND search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
  ]);

  const [tours, tips, companies] = await Promise.all([
    prisma.tour.findMany({
      where: {
        id: { in: tourRows.map((row) => row.id) },
        deletedAt: null,
        AND: [PUBLIC_TOUR_VISIBILITY],
      },
      include: {
        reviews: true,
        company: { select: { name: true, slug: true } },
      },
    }),
    prisma.travelTip.findMany({
      where: { id: { in: tipRows.map((row) => row.id) }, deletedAt: null },
    }),
    prisma.company.findMany({
      where: { id: { in: companyRows.map((row) => row.id) }, status: "ACTIVE", isPublic: true },
      include: { _count: { select: { tours: { where: { publicationStatus: "PUBLISHED", deletedAt: null } } } } },
    }),
  ]);

  return {
    tours: tours.map((tour) => tourListSerializer(tour)),
    tips: tips.map((tip) => tipSerializer(tip)),
    companies: companies.map((company) => companyPublicSerializer(company)),
  };
}
