const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Builds can run without database credentials (for example, a Vercel Preview
// deployment whose environment variables are scoped to Production only).
// Prisma still needs syntactically valid URLs to generate the client, so use a
// placeholder and skip migrations when no real connection string is present.
const PLACEHOLDER_DATABASE_URL =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

const FAILED_MIGRATION = "20261118060000_private_hire_company_types";
const MIN_CONNECT_TIMEOUT_SECONDS = 30;
const MIGRATE_RETRY_DELAYS_MS = [3000, 5000];

function firstValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Derive Neon's unpooled (direct) connection URL from a pooled `-pooler` URL.
 * Prisma `migrate deploy` uses advisory locks and should connect directly to
 * Neon rather than through PgBouncer (`-pooler`).
 */
function toUnpooledNeonUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.hostname.endsWith(".neon.tech") &&
      parsed.hostname.includes("-pooler.")
    ) {
      parsed.hostname = parsed.hostname.replace("-pooler.", ".");
      parsed.searchParams.delete("pgbouncer");
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

/**
 * Ensure PostgreSQL connections have enough connect_timeout for serverless
 * databases like Neon to wake from scale-to-zero cold starts (Prisma defaults
 * to 5s, which frequently triggers P1001 during cold wakes).
 */
function withConnectTimeout(rawUrl, minSeconds = MIN_CONNECT_TIMEOUT_SECONDS) {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
      return rawUrl;
    }
    const existing = Number.parseInt(
      parsed.searchParams.get("connect_timeout") ?? "",
      10,
    );
    if (!Number.isFinite(existing) || existing < minSeconds) {
      parsed.searchParams.set("connect_timeout", String(minSeconds));
    }
    if (
      parsed.hostname.endsWith(".neon.tech") &&
      !parsed.searchParams.has("sslmode")
    ) {
      parsed.searchParams.set("sslmode", "require");
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Return ordered migration connection candidates:
 *  1. Direct/unpooled URL with >=30s connect_timeout (best for Neon migrations)
 *  2. Original configured URL with >=30s connect_timeout (fallback)
 */
function buildMigrationDirectUrlCandidates(rawDirectUrl, rawDatabaseUrl) {
  const baseDirect = rawDirectUrl || rawDatabaseUrl;
  if (!baseDirect) return [];

  const candidates = [];
  const addCandidate = (url) => {
    if (!url) return;
    const tuned = withConnectTimeout(url, MIN_CONNECT_TIMEOUT_SECONDS);
    if (!candidates.includes(tuned)) {
      candidates.push(tuned);
    }
  };

  addCandidate(toUnpooledNeonUrl(baseDirect));
  addCandidate(baseDirect);
  if (rawDatabaseUrl) {
    addCandidate(toUnpooledNeonUrl(rawDatabaseUrl));
    addCandidate(rawDatabaseUrl);
  }
  return candidates;
}

function isUnreachableDatabaseError(output) {
  if (typeof output !== "string") return false;
  return (
    /\bP1001\b|\bP1002\b|\bP1017\b/.test(output) ||
    /Can't reach database server/i.test(output) ||
    /Timed out fetching a new connection/i.test(output)
  );
}

function isKnownFailedMigrationError(output) {
  if (typeof output !== "string") return false;
  return /\bP3009\b/.test(output) && output.includes(FAILED_MIGRATION);
}

function describeHost(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname || "configured host";
  } catch {
    return "configured host";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runInherit(commandLine, env = process.env) {
  const result = spawnSync(commandLine, {
    stdio: "inherit",
    shell: true,
    env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCaptured(commandLine, env = process.env) {
  const result = spawnSync(commandLine, {
    stdio: "pipe",
    encoding: "utf8",
    shell: true,
    env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return {
    status: result.status ?? 1,
    output: `${result.stdout || ""}\n${result.stderr || ""}`,
  };
}

async function applyMigrationsWithRetry(databaseUrl, rawDirectUrl) {
  if (process.env.SKIP_DB_MIGRATE === "true") {
    console.warn("[build] SKIP_DB_MIGRATE=true; skipping build-time migrations.");
    return;
  }

  const candidates = buildMigrationDirectUrlCandidates(rawDirectUrl, databaseUrl);
  const tunedDatabaseUrl = withConnectTimeout(databaseUrl, MIN_CONNECT_TIMEOUT_SECONDS);
  const totalAttempts = MIGRATE_RETRY_DELAYS_MS.length + 1;
  let resolvedKnownFailed = false;

  for (let attempt = 0; attempt < totalAttempts; attempt += 1) {
    // Attempt 1 & 2 prefer the unpooled/direct Neon URL (giving Neon compute
    // time to wake on retry); final attempt falls back to the second candidate
    // (for example, original URL) if one exists.
    const candidateIndex =
      attempt === totalAttempts - 1 && candidates.length > 1 ? 1 : 0;
    const directCandidate = candidates[candidateIndex] || tunedDatabaseUrl;
    const host = describeHost(directCandidate);

    console.log(
      `[build] Applying Prisma migrations (attempt ${attempt + 1}/${totalAttempts}, host: ${host}).`,
    );

    const migrateEnv = {
      ...process.env,
      DATABASE_URL: tunedDatabaseUrl,
      DIRECT_URL: directCandidate,
    };

    let result = runCaptured("npx prisma migrate deploy", migrateEnv);

    if (result.status === 0) {
      return;
    }

    // Only run migrate resolve if Prisma specifically reports the known failed migration.
    if (!resolvedKnownFailed && isKnownFailedMigrationError(result.output)) {
      resolvedKnownFailed = true;
      console.warn(
        `[build] Detected failed migration ${FAILED_MIGRATION}; marking rolled back and retrying deploy.`,
      );
      runCaptured(
        `npx prisma migrate resolve --rolled-back ${FAILED_MIGRATION}`,
        migrateEnv,
      );
      result = runCaptured("npx prisma migrate deploy", migrateEnv);
      if (result.status === 0) {
        return;
      }
    }

    if (!isUnreachableDatabaseError(result.output)) {
      // Real migration / schema / auth failure — fail the build immediately.
      process.exit(result.status);
    }

    if (attempt < totalAttempts - 1) {
      const delayMs = MIGRATE_RETRY_DELAYS_MS[attempt] ?? 3000;
      console.warn(
        `[build] Database server at ${host} was unreachable (P1001/P1002); retrying in ${Math.round(delayMs / 1000)}s...`,
      );
      await sleep(delayMs);
    }
  }

  if (process.env.STRICT_DB_MIGRATE === "true") {
    console.error(
      "[build] Database remained unreachable after all retries and STRICT_DB_MIGRATE=true; aborting build.",
    );
    process.exit(1);
  }

  console.warn(
    `[build] WARNING: Database server could not be reached after ${totalAttempts} attempts (P1001/P1002). ` +
      "Skipping build-time migrations so Prisma client generation and Next.js build can complete. " +
      "Verify that your Neon database is active and run `npm run db:migrate` if schema migrations are pending.",
  );
}

async function main() {
  // Load .env for local builds. Values already present in the environment win,
  // which matches how Next.js and Prisma resolve their configuration.
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch (error) {
      console.warn(`[build] Could not load ${envPath}: ${error.message}`);
    }
  }

  const databaseUrl = firstValue(
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.PRISMA_DATABASE_URL,
  );

  const rawDirectUrl = firstValue(
    process.env.DIRECT_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL_NON_POOLING,
    databaseUrl,
  );

  const hasDatabase = Boolean(databaseUrl);

  if (hasDatabase) {
    const primaryDirectUrl =
      buildMigrationDirectUrlCandidates(rawDirectUrl, databaseUrl)[0] ||
      withConnectTimeout(rawDirectUrl, MIN_CONNECT_TIMEOUT_SECONDS);
    process.env.DATABASE_URL = withConnectTimeout(
      databaseUrl,
      MIN_CONNECT_TIMEOUT_SECONDS,
    );
    process.env.DIRECT_URL = primaryDirectUrl;
    console.log("[build] Database connection configured; applying migrations.");
    await applyMigrationsWithRetry(databaseUrl, rawDirectUrl);
  } else {
    process.env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
    process.env.DIRECT_URL = PLACEHOLDER_DATABASE_URL;
    console.warn(
      "[build] DATABASE_URL/DIRECT_URL are not set. Skipping migrations and " +
        "using a placeholder connection so Prisma can generate the client. " +
        "Set the database environment variables to enable database features.",
    );
  }

  runInherit("npx prisma generate");
  runInherit("npx next build");
}

module.exports = {
  buildMigrationDirectUrlCandidates,
  describeHost,
  firstValue,
  isKnownFailedMigrationError,
  isUnreachableDatabaseError,
  toUnpooledNeonUrl,
  withConnectTimeout,
};

if (require.main === module) {
  main().catch((error) => {
    console.error("[build] Unexpected build error:", error);
    process.exit(1);
  });
}
