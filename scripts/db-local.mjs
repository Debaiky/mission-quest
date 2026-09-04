// Local development database: runs the Postgres bundled with `embedded-postgres`
// (installed as a dev dependency) on port 5433, with data under ./.pg (git-ignored).
// Usage: npm run db:start | npm run db:stop
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const platformPkg = `@embedded-postgres/${process.platform}-${process.arch}`;
const bin = path.join(root, "node_modules", platformPkg, "native", "bin");
if (!existsSync(bin)) {
  console.error(`Could not find  under node_modules. Run npm install first.`);
  process.exit(1);
}
const dataDir = path.join(root, ".pg", "data");
const logFile = path.join(root, ".pg", "pg.log");
const port = process.env.PGPORT ?? "5433";
const cmd = process.argv[2] ?? "start";

function run(exe, args, opts = {}) {
  const r = spawnSync(path.join(bin, exe), args, { stdio: "inherit", ...opts });
  return r.status ?? 1;
}

if (cmd === "start") {
  mkdirSync(path.join(root, ".pg"), { recursive: true });
  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Initialising local Postgres cluster in .pg/data …");
    if (run("initdb", ["-D", dataDir, "-U", "postgres", "--auth=trust", "-E", "UTF8"]) !== 0) process.exit(1);
  }
  const status = run("pg_ctl", ["-D", dataDir, "status"], { stdio: "ignore" });
  if (status === 0) {
    console.log(`Postgres already running on port ${port}.`);
  } else {
    const code = run("pg_ctl", ["-D", dataDir, "-o", `-p ${port} -k /tmp -c listen_addresses=localhost`, "-l", logFile, "start"]);
    if (code !== 0) process.exit(code);
  }
  // Ensure the dev database exists (pg is a runtime dependency).
  const { Client } = require("pg");
  const client = new Client({ host: "localhost", port: Number(port), user: "postgres", database: "postgres" });
  await client.connect();
  const exists = await client.query("select 1 from pg_database where datname = 'mission_quest'");
  if (!exists.rowCount) {
    await client.query("create database mission_quest");
    console.log("Created database mission_quest.");
  }
  await client.end();
  console.log(`Ready: postgresql://postgres@localhost:${port}/mission_quest`);
} else if (cmd === "stop") {
  process.exit(run("pg_ctl", ["-D", dataDir, "stop", "-m", "fast"]));
} else {
  console.error("Usage: node scripts/db-local.mjs start|stop");
  process.exit(1);
}
