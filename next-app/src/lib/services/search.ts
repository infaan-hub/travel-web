import "server-only";
import prisma from "@/lib/db/prisma";
import {
  attractionSerializer,
  tipSerializer,
  tourListSerializer,
  type Json,
} from "@/lib/serializers";

type RankedRow = { id: number; rank: number };

/**
 * Full-text search across tours, attractions and travel tips using the
 * PostgreSQL `tsvector` columns with GIN indexes.
 */
export async function searchContent(query: string): Promise<{
  tours: Json[];
  attractions: Json[];
  tips: Json[];
}> {
  const trimmed = query.trim();
  if (!trimmed) return { tours: [], attractions: [], tips: [] };

  const [tourRows, attractionRows, tipRows] = await Promise.all([
    prisma.$queryRaw<RankedRow[]>`
      SELECT id, ts_rank(search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM tours
       WHERE deleted_at IS NULL
         AND search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
    prisma.$queryRaw<RankedRow[]>`
      SELECT id, ts_rank(search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM attractions
       WHERE deleted_at IS NULL
         AND search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
    prisma.$queryRaw<RankedRow[]>`
      SELECT id, ts_rank(search_vector, websearch_to_tsquery('simple', ${trimmed})) AS rank
        FROM travel_tips
       WHERE deleted_at IS NULL
         AND search_vector @@ websearch_to_tsquery('simple', ${trimmed})
       ORDER BY rank DESC
       LIMIT 20`,
  ]);

  const [tours, attractions, tips] = await Promise.all([
    prisma.tour.findMany({
      where: { id: { in: tourRows.map((row) => row.id) }, deletedAt: null },
      include: { reviews: true },
    }),
    prisma.attraction.findMany({
      where: { id: { in: attractionRows.map((row) => row.id) }, deletedAt: null },
    }),
    prisma.travelTip.findMany({
      where: { id: { in: tipRows.map((row) => row.id) }, deletedAt: null },
    }),
  ]);

  return {
    tours: tours.map((tour) => tourListSerializer(tour)),
    attractions: attractions.map((attraction) => attractionSerializer(attraction)),
    tips: tips.map((tip) => tipSerializer(tip)),
  };
}
