const { spawnSync } = require("child_process");

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
