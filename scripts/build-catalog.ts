/**
 * Downloads the full TCGdex catalog into catalog/catalog.json.gz for the "static" data mode,
 * so the site needs no database. Runs before `next build` (npm "prebuild").
 *
 * - Reuses a copy younger than CATALOG_MAX_AGE_HOURS (default 20) from the build cache, so
 *   ordinary code deploys don't re-download ~24,000 cards; the weekly rebuild refreshes it.
 *   A copy that lacks a set TCGdex now lists is never reused, so a rebuild started by
 *   app/api/cron/new-sets always brings the new set in.
 * - If TCGdex fails, falls back to the previous copy; with none, the build fails (and Vercel
 *   keeps serving the current deployment).
 * - Skips itself when POKEMON_TCG_DATA_SOURCE selects another data source.
 *
 * Flags: --force (always download).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadProjectEnv } from "../lib/load-env";
import {
  decodeStaticCatalog,
  encodeStaticCatalog,
  STATIC_CATALOG_PATH,
  STATIC_CATALOG_VERSION,
  type StaticCatalogFile,
} from "../lib/tcg/static-catalog-file";
import {
  applySetReleaseDates,
  fetchAllTcgdexCardsForSync,
  fetchAllTcgdexSetsForSync,
  getTcgdexSets,
} from "../lib/tcg/tcgdex/queries";

loadProjectEnv();

const root = process.cwd();
const outputPath = path.join(root, STATIC_CATALOG_PATH);
// Vercel restores .next/cache between builds of the same project.
const cachePath = path.join(root, ".next/cache/podex-catalog/catalog.json.gz");
const maxAgeHours = Number(process.env.CATALOG_MAX_AGE_HOURS ?? 20);
/** A fresh download with far fewer cards than the last one is treated as broken. */
const MIN_SHARE_OF_PREVIOUS = 0.9;

function readCatalog(file: string): StaticCatalogFile | null {
  if (!existsSync(file)) return null;
  return decodeStaticCatalog(readFileSync(file));
}

function write(catalog: StaticCatalogFile) {
  const buffer = encodeStaticCatalog(catalog);
  for (const file of [outputPath, cachePath]) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, buffer);
  }
  return buffer.length;
}

/** Sets TCGdex lists that the catalog lacks (one cheap request; an error counts as none). */
async function missingSetIds(catalog: StaticCatalogFile): Promise<string[]> {
  try {
    const known = new Set(catalog.sets.map((set) => set.id));
    return (await getTcgdexSets()).filter((set) => !known.has(set.id)).map((set) => set.id);
  } catch {
    return [];
  }
}

function describe(catalog: StaticCatalogFile) {
  return `${catalog.cards.length.toLocaleString("en-US")} cards, ${catalog.sets.length} sets, built ${catalog.builtAt}`;
}

async function download(): Promise<StaticCatalogFile> {
  let last = 0;
  const sets = await fetchAllTcgdexSetsForSync();
  const cards = await fetchAllTcgdexCardsForSync((loaded) => {
    if (loaded - last >= 2000) {
      last = loaded;
      console.log(`  …${loaded.toLocaleString("en-US")} cards`);
    }
  });
  applySetReleaseDates(cards, sets);
  return { version: STATIC_CATALOG_VERSION, builtAt: new Date().toISOString(), sets, cards };
}

async function main() {
  const source = process.env.POKEMON_TCG_DATA_SOURCE?.trim().toLowerCase();
  if (source && source !== "static") {
    console.log(`build-catalog: skipped (POKEMON_TCG_DATA_SOURCE=${source}).`);
    return;
  }

  const previous = readCatalog(cachePath) ?? readCatalog(outputPath);
  const ageHours = previous ? (Date.now() - Date.parse(previous.builtAt)) / 3_600_000 : Infinity;

  const current = previous?.version === STATIC_CATALOG_VERSION;
  if (previous && current && ageHours < maxAgeHours && !process.argv.includes("--force")) {
    const missing = await missingSetIds(previous);
    if (missing.length === 0) {
      write(previous);
      console.log(`build-catalog: reusing cached catalog (${describe(previous)}).`);
      return;
    }
    console.log(`build-catalog: new sets on TCGdex (${missing.join(", ")}); not reusing the cached catalog.`);
  }

  console.log("build-catalog: downloading the catalog from TCGdex…");
  try {
    const fresh = await download();
    if (fresh.cards.length === 0) throw new Error("TCGdex returned no cards.");
    if (previous && fresh.cards.length < previous.cards.length * MIN_SHARE_OF_PREVIOUS) {
      throw new Error(
        `Download looks incomplete: ${fresh.cards.length} cards vs ${previous.cards.length} last time.`,
      );
    }
    if (previous) {
      const known = new Set(previous.cards.map((card) => card.id));
      fresh.addedCardIds = fresh.cards.filter((card) => !known.has(card.id)).map((card) => card.id).slice(0, 3000);
      const knownSets = new Set(previous.sets.map((set) => set.id));
      fresh.addedSetIds = fresh.sets.filter((set) => !knownSets.has(set.id)).map((set) => set.id);
    }
    const bytes = write(fresh);
    console.log(`build-catalog: wrote ${describe(fresh)} (${(bytes / 1024 / 1024).toFixed(1)} MB compressed).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!previous) throw new Error(`build-catalog: download failed and no previous catalog exists. ${message}`);
    write(previous);
    console.warn(`build-catalog: download failed (${message}); using the previous catalog (${describe(previous)}).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
