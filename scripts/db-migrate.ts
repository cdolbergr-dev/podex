import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool, getPool } from "../lib/db/client";
import { loadProjectEnv } from "../lib/load-env";

loadProjectEnv();

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const schema = readFileSync(join(root, "lib/db/schema.sql"), "utf8");
  const statements = schema
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const pool = getPool();
  for (const statement of statements) {
    await pool.query(statement);
  }
  await closePool();
  console.log("MySQL schema applied.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
