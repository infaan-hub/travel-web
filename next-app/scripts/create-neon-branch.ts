/**
 * Creates a Neon branch for a pull request preview and prints the connection
 * string as `DATABASE_URL=<value>` so CI can export it.
 *
 * Required environment variables:
 *   NEON_API_KEY  Neon API key with branch permissions
 *   NEON_PROJECT_ID Neon project id
 *   BRANCH_NAME   Branch name (defaults to a PR friendly name)
 */
const NEON_API = "https://console.neon.tech/api/v2";

async function main() {
  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  const branchName = process.env.BRANCH_NAME || "preview";
  const parentBranch = process.env.NEON_PARENT_BRANCH || "main";

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
    console.error(`Failed to list branches: ${branchesResponse.status} ${await branchesResponse.text()}`);
    process.exitCode = 1;
    return;
  }
  const branches = (await branchesResponse.json()) as {
    branches: { id: string; name: string }[];
  };

  let branch = branches.branches.find((item) => item.name === branchName);
  if (!branch) {
    const parent = branches.branches.find((item) => item.name === parentBranch);
    const createResponse = await fetch(`${NEON_API}/projects/${projectId}/branches`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        branch: {
          name: branchName,
          parent_branch_id: parent?.id ?? branches.branches[0]?.id,
        },
      }),
    });
    if (!createResponse.ok) {
      console.error(`Failed to create branch: ${createResponse.status} ${await createResponse.text()}`);
      process.exitCode = 1;
      return;
    }
    const created = (await createResponse.json()) as { branch: { id: string; name: string } };
    branch = created.branch;
  }

  const uriResponse = await fetch(
    `${NEON_API}/projects/${projectId}/connection_uris?branch_id=${branch.id}&database_name=neondb&pooled=false`,
    { headers },
  );
  if (!uriResponse.ok) {
    console.error(`Failed to read connection uri: ${uriResponse.status} ${await uriResponse.text()}`);
    process.exitCode = 1;
    return;
  }
  const uris = (await uriResponse.json()) as { connection_uris: { uri: string }[] };
  const uri = uris.connection_uris[0]?.uri;
  if (!uri) {
    console.error("No connection uri returned");
    process.exitCode = 1;
    return;
  }

  console.log(`DATABASE_URL=${uri}`);
  console.log(`DIRECT_URL=${uri}`);
  console.log(`NEON_BRANCH_ID=${branch.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
