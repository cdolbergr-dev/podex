import { gunzipSync, gzipSync } from "node:zlib";
import type { Card, CardSet } from "@/types/catalog";

/** Where the downloaded catalog lives in the project (and in each server function's bundle). */
export const STATIC_CATALOG_PATH = "catalog/catalog.json.gz";

export type StaticCatalogFile = {
  version: 1;
  /** ISO time the catalog was downloaded from TCGdex. */
  builtAt: string;
  sets: CardSet[];
  cards: Card[];
};

export function encodeStaticCatalog(catalog: StaticCatalogFile): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(catalog)), { level: 9 });
}

export function decodeStaticCatalog(buffer: Buffer): StaticCatalogFile | null {
  try {
    const parsed = JSON.parse(gunzipSync(buffer).toString("utf8")) as Partial<StaticCatalogFile>;
    if (parsed.version !== 1 || !Array.isArray(parsed.cards) || !Array.isArray(parsed.sets)) return null;
    return parsed as StaticCatalogFile;
  } catch {
    return null;
  }
}
