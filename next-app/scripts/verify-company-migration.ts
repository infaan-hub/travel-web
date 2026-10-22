/**
 * Verify the company-domain migration without changing data.
 *
 * Before applying the migration, capture a row-count baseline:
 *
 *   npx tsx --env-file=.env scripts/verify-company-migration.ts \
 *     --write-baseline "$TEMP/phase3-baseline.json"
 *
 * After applying the migration (and optionally the backfill), verify it:
 *
 *   npm run db:verify:companies -- --baseline "$TEMP/phase3-baseline.json"
 *
 * The script compares only tables that existed before the company migration,
 * then checks company/bookings invariants. It never repairs data.
 */
import { PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const prisma = new PrismaClient();

const PRE_EXISTING_TABLES = [
  "users",
  "profiles",
  "tours",
  "tour_gallery_images",
  "itinerary_items",
  "attractions",
  "reviews",
  "bookings",
  "contact_messages",
  "travel_tips",
  "home_settings",
  "travel_drivers",
  "travel_vehicles",
  "hotels",
  "rooms",
  "workspaces",
  "workspace_tasks",
  "visitor_tracking",
  "audit_logs",
  "push_subscriptions",
  "notifications",
  "verification_tokens",
  "tour_translations",
  "funnel_events",
  "_WorkspaceTours",
  "_WorkspaceRooms",
] as const;

type Baseline = {
  version: 1;
  capturedAt: string;
  tables: Record<string, number>;
};

type CountRow = { count: number };

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

function tableName(table: string): string {
  if (!/^[A-Za-z_]+$/.test(table)) throw new Error(`Unsafe table name: ${table}`);
  return table;
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function countTable(table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(
    `SELECT count(*)::int AS count FROM "${tableName(table)}"`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function countQuery(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function captureCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of PRE_EXISTING_TABLES) {
    counts[table] = await countTable(table);
  }
  return counts;
}

function print(message: string) {
  console.log(message);
}

async function main() {
  const writeBaselinePath = readArg("--write-baseline");
  const baselinePath = readArg("--baseline");
  const jsonOutput = process.argv.includes("--json");
  const failures: string[] = [];
  const warnings: string[] = [];

  if (writeBaselinePath) {
    const baseline: Baseline = {
      version: 1,
      capturedAt: new Date().toISOString(),
      tables: await captureCounts(),
    };
    const target = resolve(writeBaselinePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    if (!jsonOutput) {
      print(`Wrote pre-migration baseline for ${Object.keys(baseline.tables).length} tables to ${target}`);
      print(`Total rows: ${Object.values(baseline.tables).reduce((sum, value) => sum + value, 0)}`);
    }
    if (!baselinePath) return;
  }

  const currentCounts = await captureCounts();

  if (baselinePath) {
    const baseline = JSON.parse(await readFile(resolve(baselinePath), "utf8")) as Baseline;
    const expectedTables = Object.entries(baseline.tables ?? {});
    if (!expectedTables.length) failures.push(`baseline ${baselinePath} has no table counts`);

    for (const [table, expected] of expectedTables) {
      const actual = currentCounts[table];
      if (actual === undefined) {
        failures.push(`pre-existing table "${table}" is missing after migration`);
      } else if (actual !== expected) {
        failures.push(`row count changed for "${table}": expected ${expected}, found ${actual}`);
      }
    }

    if (!jsonOutput) {
      print(
        `Baseline check: ${expectedTables.length - failures.filter((item) => item.startsWith("row count") || item.includes("is missing after migration")).length}/${expectedTables.length} tables unchanged`,
      );
    }
  }

  const companiesReady =
    (await tableExists("companies")) && (await tableExists("company_memberships"));

  if (!companiesReady) {
    warnings.push("companies/company_memberships are absent; company invariants were skipped");
  } else {
    const checks: Array<{ label: string; sql: string }> = [
      {
        label: "bookings without tours",
        sql: `SELECT count(*)::int AS count
              FROM "bookings" b
              LEFT JOIN "tours" t ON t."id" = b."tour_id"
              WHERE t."id" IS NULL`,
      },
      {
        label: "tours with unknown companies",
        sql: `SELECT count(*)::int AS count
              FROM "tours" t
              LEFT JOIN "companies" c ON c."id" = t."company_id"
              WHERE t."company_id" IS NOT NULL AND c."id" IS NULL`,
      },
      {
        label: "published tours without a company",
        sql: `SELECT count(*)::int AS count
              FROM "tours" t
              WHERE t."publication_status" = 'PUBLISHED'
                AND t."deleted_at" IS NULL
                AND t."company_id" IS NULL`,
      },
      {
        label: "published tours owned by non-active companies",
        sql: `SELECT count(*)::int AS count
              FROM "tours" t
              JOIN "companies" c ON c."id" = t."company_id"
              WHERE t."publication_status" = 'PUBLISHED'
                AND t."deleted_at" IS NULL
                AND c."status" <> 'ACTIVE'`,
      },
      {
        label: "published tours owned by non-public companies",
        sql: `SELECT count(*)::int AS count
              FROM "tours" t
              JOIN "companies" c ON c."id" = t."company_id"
              WHERE t."publication_status" = 'PUBLISHED'
                AND t."deleted_at" IS NULL
                AND c."is_public" = false`,
      },
      {
        label: "active duplicate memberships",
        sql: `SELECT count(*)::int AS count
              FROM (
                SELECT "company_id", "user_id"
                FROM "company_memberships"
                WHERE "status" = 'ACTIVE'
                GROUP BY "company_id", "user_id"
                HAVING count(*) > 1
              ) duplicates`,
      },
      {
        label: "memberships pointing at missing users",
        sql: `SELECT count(*)::int AS count
              FROM "company_memberships" m
              LEFT JOIN "users" u ON u."id" = m."user_id"
              WHERE u."id" IS NULL`,
      },
      {
        label: "memberships pointing at missing companies",
        sql: `SELECT count(*)::int AS count
              FROM "company_memberships" m
              LEFT JOIN "companies" c ON c."id" = m."company_id"
              WHERE c."id" IS NULL`,
      },
      {
        label: "bookings with unknown companies",
        sql: `SELECT count(*)::int AS count
              FROM "bookings" b
              LEFT JOIN "companies" c ON c."id" = b."company_id"
              WHERE b."company_id" IS NOT NULL AND c."id" IS NULL`,
      },
      {
        label: "bookings attributed to a different company than their tour",
        sql: `SELECT count(*)::int AS count
              FROM "bookings" b
              JOIN "tours" t ON t."id" = b."tour_id"
              WHERE b."company_id" IS NOT NULL
                AND t."company_id" IS NOT NULL
                AND b."company_id" <> t."company_id"`,
      },
      {
        label: "company bookings missing companyNameSnapshot",
        sql: `SELECT count(*)::int AS count
              FROM "bookings" b
              WHERE b."company_id" IS NOT NULL
                AND (b."company_name_snapshot" IS NULL OR btrim(b."company_name_snapshot") = '')`,
      },
      {
        label: "bookings missing tourTitleSnapshot",
        sql: `SELECT count(*)::int AS count
              FROM "bookings" b
              WHERE b."tour_title_snapshot" IS NULL OR btrim(b."tour_title_snapshot") = ''`,
      },
      {
        label: "companies missing generated search vectors",
        sql: `SELECT count(*)::int AS count
              FROM "companies"
              WHERE "search_vector" IS NULL`,
      },
    ];

    for (const check of checks) {
      const count = await countQuery(check.sql);
      if (count > 0) failures.push(`${check.label}: ${count}`);
    }

    const publicationCounts = await prisma.$queryRaw<
      Array<{ status: string; count: number }>
    >`SELECT "publication_status"::text AS status, count(*)::int AS count
      FROM "tours"
      GROUP BY "publication_status"
      ORDER BY "publication_status"::text`;
    const companyCount = await countTable("companies");
    const membershipCount = await countTable("company_memberships");

    if (!jsonOutput) {
      print("");
      print(`Company tables: ${companyCount} companies, ${membershipCount} memberships`);
      for (const row of publicationCounts) {
        print(`Tours ${row.status}: ${row.count}`);
      }
    }
  }

  if (jsonOutput) {
    console.log(
      JSON.stringify(
        {
          baseline: baselinePath ?? null,
          currentCounts,
          companiesReady,
          failures,
          warnings,
        },
        null,
        2,
      ),
    );
  } else {
    if (warnings.length) {
      print("");
      for (const warning of warnings) print(`WARN: ${warning}`);
    }
    if (failures.length) {
      print("");
      for (const failure of failures) print(`FAIL: ${failure}`);
    } else if (companiesReady) {
      print("");
      print("Company migration verification passed.");
    } else {
      print("");
      print("Pre-migration baseline captured; company checks were skipped.");
    }
  }

  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
