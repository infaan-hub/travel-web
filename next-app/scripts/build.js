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

function firstValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

const databaseUrl = firstValue(
  process.env.DATABASE_URL,
  process.env.POSTGRES_PRISMA_URL,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.PRISMA_DATABASE_URL,
);

const directUrl = firstValue(
  process.env.DIRECT_URL,
  process.env.DATABASE_URL_UNPOOLED,
  process.env.POSTGRES_URL_NON_POOLING,
  databaseUrl,
);

const hasDatabase = Boolean(databaseUrl);

if (hasDatabase) {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = directUrl;
  console.log("[build] Database connection configured; applying migrations.");
} else {
  process.env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
  process.env.DIRECT_URL = PLACEHOLDER_DATABASE_URL;
  console.warn(
    "[build] DATABASE_URL/DIRECT_URL are not set. Skipping migrations and " +
      "using a placeholder connection so Prisma can generate the client. " +
      "Set the database environment variables to enable database features.",
  );
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (hasDatabase) {
  // Best-effort: mark the previously failed migration as rolled back so deploy
  // can retry.
  spawnSync(
    "npx",
    ["prisma", "migrate", "resolve", "--rolled-back", FAILED_MIGRATION],
    {
      stdio: "ignore",
      shell: true,
      env: process.env,
    },
  );

  run("npx", ["prisma", "migrate", "deploy"]);
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build"]);
