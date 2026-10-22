/**
 * Safely backfill company attribution without inventing companies.
 *
 * Dry-run by default:
 *
 *   npm run db:backfill:companies -- --dry-run
 *
 * Apply booking attribution/snapshots only (tours stay exactly where they are):
 *
 *   npm run db:backfill:companies -- --apply
 *
 * Explicitly assign currently unowned tours to an existing company. This never
 * changes publication status; assigned tours remain whatever they already are
 * (legacy tours stay DRAFT):
 *
 *   npm run db:backfill:companies -- --company demo-company --assign-tours \
 *     --tour-ids 46,48 --apply
 *
 * Existing non-empty company attribution and snapshots are never overwritten.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HELP = `
Usage: npm run db:backfill:companies -- [options]

Options:
  --dry-run              Report what would change (default when --apply is absent).
  --apply                Write changes.
  --company <slug>       Existing company used by --assign-tours.
  --assign-tours         Assign tours whose company_id is NULL to --company.
  --tour-ids <ids>       Comma-separated tour ids to limit --assign-tours.
  --batch-size <n>       Rows per transaction (default 500, max 2000).
  --json                 Print machine-readable output.
  --help                 Show this help.

Default (no --assign-tours): only fills booking company_id from the tour's
company when the booking has no attribution, and fills empty
company_name_snapshot/tour_title_snapshot values. Existing values are preserved.
`;

type BookingRow = {
  id: number;
  companyId: number | null;
  companyNameSnapshot: string | null;
  tourTitleSnapshot: string | null;
  tourTitle: string;
  tourCompanyId: number | null;
  tourCompanyName: string | null;
  bookingCompanyName: string | null;
};

type BookingUpdate = {
  id: number;
  companyId: number | null;
  companyNameSnapshot: string | null;
  tourTitleSnapshot: string | null;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function readArg(name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
}

function parseTourIds(value: string | undefined): number[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) throw new Error("--tour-ids must contain at least one positive integer");
  return [...new Set(ids)];
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function summary() {
  return {
    tours: {
      total: await count(`SELECT count(*)::int AS count FROM "tours"`),
      unowned: await count(`SELECT count(*)::int AS count FROM "tours" WHERE "company_id" IS NULL`),
      draft: await count(
        `SELECT count(*)::int AS count FROM "tours" WHERE "publication_status" = 'DRAFT'`,
      ),
      published: await count(
        `SELECT count(*)::int AS count FROM "tours" WHERE "publication_status" = 'PUBLISHED'`,
      ),
    },
    bookings: {
      total: await count(`SELECT count(*)::int AS count FROM "bookings"`),
      withoutCompany: await count(
        `SELECT count(*)::int AS count FROM "bookings" WHERE "company_id" IS NULL`,
      ),
      missingCompanySnapshot: await count(
        `SELECT count(*)::int AS count FROM "bookings"
         WHERE "company_name_snapshot" IS NULL OR btrim("company_name_snapshot") = ''`,
      ),
      missingTourSnapshot: await count(
        `SELECT count(*)::int AS count FROM "bookings"
         WHERE "tour_title_snapshot" IS NULL OR btrim("tour_title_snapshot") = ''`,
      ),
    },
    companies: await prisma.company.count(),
    memberships: await prisma.companyMembership.count(),
  };
}

async function main() {
  if (hasFlag("--help")) {
    console.log(HELP.trim());
    return;
  }

  const apply = hasFlag("--apply");
  const explicitDryRun = hasFlag("--dry-run");
  if (apply && explicitDryRun) throw new Error("Use either --dry-run or --apply, not both");

  const dryRun = !apply;
  const companySlug = readArg("--company");
  const assignTours = hasFlag("--assign-tours");
  const tourIds = parseTourIds(readArg("--tour-ids"));
  const jsonOutput = hasFlag("--json");
  const batchSize = Math.min(2000, Math.max(1, Number(readArg("--batch-size") ?? 500)));

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("--batch-size must be a positive integer");
  }
  if (companySlug && !assignTours) {
    throw new Error("--company requires --assign-tours");
  }
  if (assignTours && !companySlug) {
    throw new Error("--assign-tours requires --company <slug>");
  }
  if (tourIds && !assignTours) {
    throw new Error("--tour-ids requires --assign-tours");
  }

  const before = await summary();
  const warnings: string[] = [];

  if (!jsonOutput) {
    console.log(dryRun ? "DRY RUN — no data will be written." : "APPLY — writing changes.");
  }

  // Explicit tour ownership assignment. Never changes publication status.
  let assignedTours = 0;
  let selectedTours: Array<{ id: number; title: string }> = [];
  if (assignTours && companySlug) {
    const company = await prisma.company.findUnique({ where: { slug: companySlug } });
    if (!company) throw new Error(`Company not found: ${companySlug}`);
    if (company.status === "ARCHIVED") {
      throw new Error(`Company ${companySlug} is archived and cannot own new tours`);
    }
    if (company.status !== "ACTIVE") {
      warnings.push(`Company ${companySlug} is ${company.status}, not ACTIVE`);
    }

    selectedTours = await prisma.tour.findMany({
      where: {
        companyId: null,
        ...(tourIds ? { id: { in: tourIds } } : {}),
      },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
    });

    if (tourIds) {
      const foundIds = new Set(selectedTours.map((tour) => tour.id));
      const skipped = tourIds.filter((id) => !foundIds.has(id));
      if (skipped.length) {
        warnings.push(
          `Skipped tour ids ${skipped.join(", ")}: missing or already owned by a company`,
        );
      }
    }

    if (!dryRun && selectedTours.length) {
      for (const batch of chunks(selectedTours, batchSize)) {
        const result = await prisma.tour.updateMany({
          where: { id: { in: batch.map((tour) => tour.id) }, companyId: null },
          data: { companyId: company.id },
        });
        assignedTours += result.count;
      }
    } else {
      assignedTours = selectedTours.length;
    }

    if (!jsonOutput) {
      console.log(
        `${dryRun ? "Would assign" : "Assigned"} ${assignedTours} unowned tour(s) to ${company.slug} (${company.name}); publication status unchanged.`,
      );
      for (const tour of selectedTours.slice(0, 20)) {
        console.log(`  tour ${tour.id}: ${tour.title}`);
      }
      if (selectedTours.length > 20) {
        console.log(`  … ${selectedTours.length - 20} more`);
      }
    }
  }

  // Booking attribution and immutable snapshots. Only null/empty values change.
  const rows = await prisma.$queryRaw<BookingRow[]>`
    SELECT
      b."id" AS "id",
      b."company_id" AS "companyId",
      NULLIF(btrim(b."company_name_snapshot"), '') AS "companyNameSnapshot",
      NULLIF(btrim(b."tour_title_snapshot"), '') AS "tourTitleSnapshot",
      t."title" AS "tourTitle",
      t."company_id" AS "tourCompanyId",
      tc."name" AS "tourCompanyName",
      bc."name" AS "bookingCompanyName"
    FROM "bookings" b
    JOIN "tours" t ON t."id" = b."tour_id"
    LEFT JOIN "companies" tc ON tc."id" = t."company_id"
    LEFT JOIN "companies" bc ON bc."id" = b."company_id"
    WHERE b."company_id" IS NULL
       OR NULLIF(btrim(b."company_name_snapshot"), '') IS NULL
       OR NULLIF(btrim(b."tour_title_snapshot"), '') IS NULL
    ORDER BY b."id" ASC
  `;

  const updates: BookingUpdate[] = [];
  for (const row of rows) {
    if (row.companyId && row.tourCompanyId && row.companyId !== row.tourCompanyId) {
      warnings.push(
        `Booking ${row.id} is attributed to company ${row.companyId}, but its tour belongs to company ${row.tourCompanyId}; existing attribution preserved`,
      );
    }

    const companyId = row.companyId ?? row.tourCompanyId ?? null;
    const companyName = row.companyId ? row.bookingCompanyName : row.tourCompanyName;
    const companyNameSnapshot = row.companyNameSnapshot ?? companyName ?? null;
    const tourTitleSnapshot = row.tourTitleSnapshot ?? row.tourTitle;

    updates.push({
      id: row.id,
      // Only the SQL COALESCE decides whether these values are actually written.
      companyId,
      companyNameSnapshot,
      tourTitleSnapshot,
    });
  }

  let updatedBookings = 0;
  if (!dryRun && updates.length) {
    for (const batch of chunks(updates, batchSize)) {
      const counts = await prisma.$transaction(
        batch.map(
          (update) => prisma.$executeRaw`
            UPDATE "bookings"
            SET
              "company_id" = COALESCE("company_id", ${update.companyId}),
              "company_name_snapshot" = COALESCE(
                NULLIF(btrim("company_name_snapshot"), ''),
                ${update.companyNameSnapshot}
              ),
              "tour_title_snapshot" = COALESCE(
                NULLIF(btrim("tour_title_snapshot"), ''),
                ${update.tourTitleSnapshot}
              )
            WHERE "id" = ${update.id}
          `,
        ),
      );
      updatedBookings += counts.reduce((sum, value) => sum + Number(value), 0);
    }
  } else {
    updatedBookings = updates.length;
  }

  const after = dryRun ? before : await summary();

  if (!jsonOutput) {
    console.log(
      `${dryRun ? "Would update" : "Updated"} ${updatedBookings} booking row(s) with company attribution and/or snapshots.`,
    );
    console.log("");
    console.log(`Tours: ${after.tours.total} total, ${after.tours.unowned} unowned, ${after.tours.draft} DRAFT, ${after.tours.published} PUBLISHED`);
    console.log(
      `Bookings: ${after.bookings.total} total, ${after.bookings.withoutCompany} without company, ${after.bookings.missingCompanySnapshot} missing company snapshot, ${after.bookings.missingTourSnapshot} missing tour snapshot`,
    );
    console.log(`Companies: ${after.companies}; memberships: ${after.memberships}`);
    for (const warning of warnings) console.log(`WARN: ${warning}`);
    if (dryRun) console.log("Run again with --apply to write these changes.");
  } else {
    console.log(
      JSON.stringify(
        {
          dryRun,
          assignedTours,
          updatedBookings,
          before,
          after,
          selectedTourIds: selectedTours.map((tour) => tour.id),
          warnings,
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
