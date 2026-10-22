/**
 * Resolves the connection string for a Neon project's default (production)
 * branch and prints it as `DATABASE_URL=<uri>` so CI can capture it as an
 * output without echoing the secret.
 *
 * Required environment variables:
 *   NEON_API_KEY    Neon API key with branch permissions
 *   NEON_PROJECT_ID Neon project id
 */
const NEON_API = "https://console.neon.tech/api/v2";

type Branch = { id: string; name: string; default?: boolean };

async function main() {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;

  if (!apiKey || !projectId) {
    console.error("NEON_API_KEY and NEON_PROJECT_ID are required");
    process.exitCode = 1;
    return;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const branchesResponse = await fetch(`${NEON_API}/projects/${projectId}/branches`, { headers });
  if (!branchesResponse.ok) {
    console.error(`Failed to list branches: ${branchesResponse.status}`);
    process.exitCode = 1;
    return;
  }

  const { branches } = (await branchesResponse.json()) as { branches: Branch[] };
  const primary =
    branches.find((branch) => branch.default) ??
    branches.find((branch) => branch.name === "main") ??
    branches[0];

  if (!primary) {
    console.error("No branches found");
    process.exitCode = 1;
    return;
  }

  console.error(`Using Neon branch: ${primary.name}`);

  let uri: string | undefined;
  for (const databaseName of ["neondb", undefined]) {
    const query = new URLSearchParams({ branch_id: primary.id, pooled: "false" });
    if (databaseName) query.set("database_name", databaseName);

    const response = await fetch(`${NEON_API}/projects/${projectId}/connection_uris?${query}`, {
      headers,
    });
    if (!response.ok) continue;

    const body = (await response.json()) as { connection_uris?: { uri: string }[] };
    uri = body.connection_uris?.[0]?.uri;
    if (uri) break;
  }

  if (!uri) {
    console.error("No connection uri returned");
    process.exitCode = 1;
    return;
  }

  console.log(`DATABASE_URL=${uri}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
