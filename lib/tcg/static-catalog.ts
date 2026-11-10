import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { MemoryCatalog } from "@/lib/tcg/memory-catalog";
import { decodeStaticCatalog, STATIC_CATALOG_PATH } from "@/lib/tcg/static-catalog-file";

/**
 * The full catalog downloaded at build time (scripts/build-catalog.ts), shipped with each server
 * function and loaded once per server instance.
 */
let loaded: { catalog: MemoryCatalog; builtAt: string } | null = null;

function filePath(): string {
  // A literal path lets the bundler trace exactly this file (a computed one makes it ship the
  // whole project). Keep in sync with STATIC_CATALOG_PATH.
  return path.join(process.cwd(), "catalog", "catalog.json.gz");
}

export function hasStaticCatalog(): boolean {
  return existsSync(filePath());
}

function load() {
  if (loaded) return loaded;
  const file = decodeStaticCatalog(readFileSync(filePath()));
  if (!file) throw new Error(`The catalog file at ${STATIC_CATALOG_PATH} is missing or unreadable. Run npm run build:catalog.`);
  loaded = { catalog: new MemoryCatalog(file.cards, file.sets), builtAt: file.builtAt };
  return loaded;
}

export function getStaticCatalog(): MemoryCatalog {
  return load().catalog;
}

export function getStaticCatalogBuiltAt(): string {
  return load().builtAt;
}
