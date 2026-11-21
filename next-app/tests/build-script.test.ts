import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const buildScript = require("../scripts/build.js") as {
  buildMigrationDirectUrlCandidates: (
    rawDirectUrl?: string,
    rawDatabaseUrl?: string,
  ) => string[];
  describeHost: (rawUrl: string) => string;
  isKnownFailedMigrationError: (output: string) => boolean;
  isUnreachableDatabaseError: (output: string) => boolean;
  toUnpooledNeonUrl: (rawUrl: string) => string;
  withConnectTimeout: (rawUrl: string, minSeconds?: number) => string;
};

describe("scripts/build.js Neon & Prisma migration helpers", () => {
  it("derives an unpooled Neon direct URL from a pooler URL", () => {
    const pooled =
      "postgresql://neondb_owner:secret@ep-solitary-mouse-b49osqc4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true";
    const unpooled = buildScript.toUnpooledNeonUrl(pooled);

    expect(unpooled).toBe(
      "postgresql://neondb_owner:secret@ep-solitary-mouse-b49osqc4.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require",
    );
  });

  it("leaves non-Neon URLs unchanged in toUnpooledNeonUrl", () => {
    const local = "postgresql://user:pass@127.0.0.1:5432/travel?schema=public";
    expect(buildScript.toUnpooledNeonUrl(local)).toBe(local);
  });

  it("enforces at least 30s connect_timeout and sslmode=require for Neon URLs", () => {
    const raw =
      "postgresql://user:pass@ep-demo.us-east-2.aws.neon.tech/neondb?connect_timeout=5";
    const tuned = new URL(buildScript.withConnectTimeout(raw));

    expect(tuned.searchParams.get("connect_timeout")).toBe("30");
    expect(tuned.searchParams.get("sslmode")).toBe("require");
  });

  it("preserves an existing higher connect_timeout", () => {
    const raw =
      "postgresql://user:pass@ep-demo.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=60";
    const tuned = new URL(buildScript.withConnectTimeout(raw));

    expect(tuned.searchParams.get("connect_timeout")).toBe("60");
  });

  it("orders unpooled Neon direct URL first and original pooler URL second as fallback", () => {
    const pooled =
      "postgresql://user:pass@ep-solitary-mouse-b49osqc4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";
    const candidates = buildScript.buildMigrationDirectUrlCandidates(pooled, pooled);

    expect(candidates).toHaveLength(2);
    expect(buildScript.describeHost(candidates[0])).toBe(
      "ep-solitary-mouse-b49osqc4.c-6.us-east-2.aws.neon.tech",
    );
    expect(buildScript.describeHost(candidates[1])).toBe(
      "ep-solitary-mouse-b49osqc4-pooler.c-6.us-east-2.aws.neon.tech",
    );
    expect(new URL(candidates[0]).searchParams.get("connect_timeout")).toBe("30");
  });

  it("classifies P1001/P1002 unreachable errors separately from real SQL/migration errors", () => {
    expect(
      buildScript.isUnreachableDatabaseError(
        "Error: P1001: Can't reach database server at `ep-solitary-mouse-b49osqc4-pooler.c-6.us-east-2.aws.neon.tech:5432`",
      ),
    ).toBe(true);
    expect(
      buildScript.isUnreachableDatabaseError(
        "Error: P1002: The database server timed out",
      ),
    ).toBe(true);
    expect(
      buildScript.isUnreachableDatabaseError(
        "Error: P3018: A migration failed to apply. Syntax error near SELECT",
      ),
    ).toBe(false);
    expect(
      buildScript.isUnreachableDatabaseError(
        "Error: P1000: Authentication failed against database server",
      ),
    ).toBe(false);
  });

  it("detects only the known failed migration on P3009", () => {
    expect(
      buildScript.isKnownFailedMigrationError(
        "Error: P3009: migrate found failed migrations: 20261118060000_private_hire_company_types",
      ),
    ).toBe(true);
    expect(
      buildScript.isKnownFailedMigrationError(
        "Error: P3009: migrate found failed migrations: 20261121020000_other",
      ),
    ).toBe(false);
  });
});
