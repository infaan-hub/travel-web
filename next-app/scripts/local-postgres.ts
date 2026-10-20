import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), ".data/pg");
const PORT = Number(process.env.LOCAL_PG_PORT || 55432);
const USER = process.env.LOCAL_PG_USER || "postgres";
const PASSWORD = process.env.LOCAL_PG_PASSWORD || "postgres";

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    persistent: true,
    authMethod: "scram-sha-256",
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    // PG 18's default `io_method=worker` can hang on some Windows hosts.
    postgresFlags: ["-c", "io_method=sync"],
    onLog: (message) => {
      if (process.env.LOCAL_PG_VERBOSE === "1") console.log(`[pg] ${message}`);
    },
    onError: (message) => console.error(`[pg]`, message),
  });

  const marker = path.join(DATA_DIR, "PG_VERSION");
  if (!existsSync(marker)) {
    console.log(`Initialising PostgreSQL cluster at ${DATA_DIR} ...`);
    await pg.initialise();
  } else {
    console.log(`Using existing PostgreSQL cluster at ${DATA_DIR}`);
  }

  await pg.start();
  for (const name of ["infaan_travel", "infaan_travel_test"]) {
    try {
      await pg.createDatabase(name);
      console.log(`Created database ${name}`);
    } catch {
      console.log(`Database ${name} already exists`);
    }
  }

  console.log(`PostgreSQL ready at 127.0.0.1:${PORT} (user ${USER})`);
  console.log("Press Ctrl+C to stop.");

  const shutdown = async () => {
    console.log("Stopping PostgreSQL ...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
