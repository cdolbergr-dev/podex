import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadFile(filename: string) {
  const path = join(process.cwd(), filename);
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) process.env[key] = value;
  }
}

/** Load `.env.local` then `.env` for CLI scripts (Next.js loads these automatically). */
export function loadProjectEnv() {
  loadFile(".env.local");
  loadFile(".env");
}
