const { spawnSync } = require("child_process");

// Fall back to DATABASE_URL when DIRECT_URL is not configured (e.g. Vercel
// builds that only provide a pooled connection string).
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const FAILED_MIGRATION = "20261118060000_private_hire_company_types";

// Best-effort: mark the previously failed migration as rolled back so deploy can retry.
spawnSync("npx", ["prisma", "migrate", "resolve", "--rolled-back", FAILED_MIGRATION], {
  stdio: "ignore",
  shell: true,
});

const deploy = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
});

process.exit(deploy.status ?? 1);
