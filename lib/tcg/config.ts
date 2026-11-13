import { cacheLife } from "next/cache";
import { hasDatabaseConfig } from "@/lib/db/client";
import { getDatabaseSyncStatus } from "@/lib/tcg/database";
import { getStaticCatalogBuiltAt, hasStaticCatalog } from "@/lib/tcg/static-catalog";
import type { DataMode, DataSourceInfo } from "@/types/catalog";

/**
 * static — full TCGdex catalog downloaded at build time into catalog/catalog.json.gz and
 *          searched in memory (no database; what the hosted site uses).
 * database — MySQL mirror synced from TCGdex.
 * sample — small bundled JSON catalog for local development.
 * live — query TCGdex on each request (fallback / debugging).
 *
 * When POKEMON_TCG_DATA_SOURCE is unset:
 * - MySQL env vars → database
 * - downloaded catalog file present → static
 * - else → sample
 */
let detectedMode: DataMode | null = null;

export function getDataMode(): DataMode {
  const explicit = process.env.POKEMON_TCG_DATA_SOURCE?.trim().toLowerCase();
  if (explicit === "live" || explicit === "sample" || explicit === "database" || explicit === "static") return explicit;
  detectedMode ??= hasDatabaseConfig() ? "database" : hasStaticCatalog() ? "static" : "sample";
  return detectedMode;
}

/**
 * Sets the cache lifetime of a catalog read (call it inside a "use cache" function). The static
 * and sample catalogs only change with a new deployment, which starts with an empty cache, so
 * pages built from them can stay cached at the CDN until then; that keeps crawlers from re-running
 * server code. Database and live data change underneath a running deployment and keep the given
 * lifetime.
 */
export function catalogCacheLife(mode: DataMode, changing: "hours" | "days"): void {
  if (mode === "static" || mode === "sample") cacheLife("max");
  else if (changing === "hours") cacheLife("hours");
  else cacheLife("days");
}

export async function getDataSourceInfo(): Promise<DataSourceInfo> {
  const mode = getDataMode();

  if (mode === "live") {
    return {
      mode,
      label: "TCGdex",
      notice: "Reading directly from TCGdex. Configure MySQL and sync for faster browsing at scale.",
    };
  }

  if (mode === "static") {
    const builtAt = new Date(getStaticCatalogBuiltAt());
    return {
      mode,
      label: "Catalog",
      notice: `Catalog downloaded from TCGdex ${builtAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC.`,
    };
  }

  if (mode === "database") {
    const sync = await getDatabaseSyncStatus().catch(() => null);
    const count =
      sync?.cardCount != null ? `${sync.cardCount.toLocaleString("en-US")} cards in local catalog` : "Local catalog";
    const synced =
      sync?.finishedAt != null
        ? `Last synced ${new Date(sync.finishedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} from TCGdex.`
        : "Run npm run sync-catalog to import cards from TCGdex.";
    const failed = sync?.status === "failed" && sync.errorMessage ? ` Last sync failed: ${sync.errorMessage}` : "";

    return {
      mode,
      label: "Local catalog",
      notice: `${count}. ${synced}${failed}`.trim(),
    };
  }

  return {
    mode,
    label: "Sample catalog",
    notice:
      "Raichu cards from TCGdex for development. Configure MySQL and POKEMON_TCG_DATA_SOURCE=database for the full catalog.",
  };
}
