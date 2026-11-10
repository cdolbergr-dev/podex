import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { RARITIES } from "@/lib/tcg/constants";
import { suggestQuery, vocabularyFrom } from "@/lib/tcg/search-terms";
import { getTcgdexCardPrices } from "@/lib/tcg/tcgdex/pricing";
import { getDataMode, getDataSourceInfo } from "@/lib/tcg/config";
import {
  getDatabaseCard,
  getDatabaseCardIds,
  getDatabaseSearchNames,
  getDatabaseCardsByIds,
  getDatabaseRarities,
  getDatabaseSets,
  searchDatabase,
} from "@/lib/tcg/database";
import {
  getLiveCard,
  getLiveCardsByIds,
  getLiveCatalogCount,
  getLiveSets,
  searchLive,
} from "@/lib/tcg/live";
import { sampleCatalog } from "@/lib/tcg/sample";
import { getStaticCatalog } from "@/lib/tcg/static-catalog";
import type {
  Card,
  CardSearchResult,
  CardPrices,
  CardSet,
  DataMode,
  ExploreParams,
  FavoriteCardsResult,
} from "@/types/catalog";

/** In-memory catalogs: the small bundled sample, or the full one downloaded at build time. */
function memoryCatalog(mode: DataMode) {
  return mode === "static" ? getStaticCatalog() : sampleCatalog;
}

let databaseCards: { at: number; cards: Promise<Card[]> } | null = null;

/**
 * Every card in the catalog, for indexes built in memory (Pokémon, artists). The database is
 * read in one pass and kept for six hours per server instance; live mode has no full list.
 */
export function loadAllCards(mode: DataMode = getDataMode()): Promise<Card[]> {
  if (mode === "sample" || mode === "static") return Promise.resolve(memoryCatalog(mode).cards);
  if (mode === "live") return Promise.resolve([]);
  if (!databaseCards || Date.now() - databaseCards.at > 6 * 3_600_000) {
    const cards = (async () => {
      const ids = await getDatabaseCardIds();
      const chunks: Card[][] = [];
      for (let index = 0; index < ids.length; index += 2000) {
        chunks.push(await getDatabaseCardsByIds(ids.slice(index, index + 2000)));
      }
      return chunks.flat();
    })();
    databaseCards = { at: Date.now(), cards };
    cards.catch(() => {
      databaseCards = null;
    });
  }
  return databaseCards.cards;
}

/** Tag on every cached catalog read; revalidated after each catalog sync. */
export const CATALOG_CACHE_TAG = "catalog";

export type FilterMeta = {
  sets: CardSet[];
  rarities: string[];
};

async function cachedSearch(mode: DataMode, query: ExploreParams): Promise<Omit<CardSearchResult, "source">> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife(mode === "database" ? "hours" : "hours");

  if (mode === "sample" || mode === "static") {
    const result = memoryCatalog(mode).search(query);
    return { ...result, page: query.page, pageSize: query.pageSize };
  }

  if (mode === "database") {
    const result = await searchDatabase(query);
    return { ...result, page: query.page, pageSize: query.pageSize };
  }

  const [result, catalogCount] = await Promise.all([searchLive(query), getLiveCatalogCount()]);
  return { ...result, catalogCount, page: query.page, pageSize: query.pageSize };
}

async function cachedCard(mode: DataMode, id: string): Promise<Card | null> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("hours");
  if (mode === "database") return getDatabaseCard(id);
  return mode === "live" ? getLiveCard(id) : memoryCatalog(mode).card(id);
}

async function cachedCardsByIds(mode: DataMode, ids: string[]): Promise<Card[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("hours");
  if (mode === "database") return getDatabaseCardsByIds(ids);
  return mode === "live" ? getLiveCardsByIds(ids) : memoryCatalog(mode).cardsByIds(ids);
}

async function cachedVocabulary(mode: DataMode): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  if (mode === "database") return vocabularyFrom(await getDatabaseSearchNames());
  return mode === "live" ? [] : vocabularyFrom(memoryCatalog(mode).searchNames());
}

async function cachedCardIds(mode: DataMode): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  if (mode === "database") return getDatabaseCardIds();
  // Live mode would mean paging the whole TCGdex catalog; sitemaps list sets only there.
  return mode === "live" ? [] : memoryCatalog(mode).cardIds();
}

async function cachedSets(mode: DataMode): Promise<CardSet[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  if (mode === "database") return getDatabaseSets();
  return mode === "live" ? getLiveSets() : memoryCatalog(mode).sets;
}

async function cachedRarities(mode: DataMode): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  if (mode === "database") return getDatabaseRarities();
  if (mode === "sample" || mode === "static") return memoryCatalog(mode).rarities();
  return [...RARITIES];
}

export async function searchCards(query: ExploreParams): Promise<CardSearchResult> {
  await connection();
  const mode = getDataMode();
  const [result, source] = await Promise.all([cachedSearch(mode, query), getDataSourceInfo()]);
  if (result.totalCount > 0 || !query.q.trim()) return { ...result, source };

  // Nothing matched as typed: retry once with misspelled words corrected.
  const vocabulary = await cachedVocabulary(mode).catch(() => []);
  const corrected = suggestQuery(query.q, vocabulary);
  if (!corrected) return { ...result, source };

  const retry = await cachedSearch(mode, { ...query, q: corrected });
  return retry.totalCount > 0 ? { ...retry, source, correctedQuery: corrected } : { ...result, source };
}

export async function getCard(id: string): Promise<Card | null> {
  await connection();
  return cachedCard(getDataMode(), id);
}

export async function getCardsByIds(ids: string[]): Promise<FavoriteCardsResult> {
  await connection();
  const unique = [...new Set(ids)].slice(0, 200);
  const cards = await cachedCardsByIds(getDataMode(), unique);
  const found = new Set(cards.map((card) => card.id));
  return {
    cards,
    missingIds: unique.filter((id) => !found.has(id)),
  };
}

async function cachedCardPrices(id: string): Promise<CardPrices | null> {
  "use cache";
  cacheLife("hours");
  return getTcgdexCardPrices(id);
}

/** Market prices for a card (all data modes read them from TCGdex). Null if unavailable. */
export async function getCardPrices(id: string): Promise<CardPrices | null> {
  await connection();
  return cachedCardPrices(id).catch(() => null);
}

/** Every card id, for the sitemap. Cached for a day. */
export async function getAllCardIds(): Promise<string[]> {
  return cachedCardIds(getDataMode());
}

/** Sets for the sitemap — cached without request-time APIs so it can be prerendered. */
export async function getSitemapSets(): Promise<CardSet[]> {
  return cachedSets(getDataMode());
}

export async function getSets(): Promise<CardSet[]> {
  await connection();
  return cachedSets(getDataMode());
}

export async function getFilterMeta(): Promise<FilterMeta> {
  await connection();
  const mode = getDataMode();
  const [sets, rarities] = await Promise.all([cachedSets(mode), cachedRarities(mode)]);
  return { sets, rarities };
}
