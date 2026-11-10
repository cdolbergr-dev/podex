import { TcgRequestError } from "@/lib/tcg/errors";
import { tcgdexFetch } from "@/lib/tcg/tcgdex/client";
import { mapTcgdexCard, mapTcgdexSet } from "@/lib/tcg/tcgdex/map";
import type { Card, CardSet, ExploreParams } from "@/types/catalog";

type CardBrief = {
  id: string;
  localId?: string;
  name?: string;
  image?: string;
};

function buildListParams(query: ExploreParams, page: number, itemsPerPage: number): Record<string, string | number> {
  const params: Record<string, string | number> = {
    "pagination:page": page,
    "pagination:itemsPerPage": itemsPerPage,
  };

  const text = query.q.trim();
  if (text) params.name = text.includes("*") ? text : `*${text}*`;

  if (query.set) params["set.id"] = `eq:${query.set}`;
  if (query.type) params.types = query.type;
  if (query.rarity) params.rarity = `eq:${query.rarity}`;

  if (query.sort === "name") {
    params["sort:field"] = "name";
    params["sort:order"] = "ASC";
  } else if (query.sort === "number") {
    params["sort:field"] = "localId";
    params["sort:order"] = "ASC";
  } else if (query.sort === "newest") {
    params["sort:field"] = "releaseDate";
    params["sort:order"] = "DESC";
  } else {
    params["sort:field"] = "releaseDate";
    params["sort:order"] = "ASC";
  }

  return params;
}

async function listCardBriefs(
  query: ExploreParams,
  page: number,
  itemsPerPage: number,
): Promise<CardBrief[]> {
  const rows = await tcgdexFetch<CardBrief[]>("/cards", buildListParams(query, page, itemsPerPage));
  return Array.isArray(rows) ? rows : [];
}

async function hydrateCards(ids: string[]): Promise<Card[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const raw = await tcgdexFetch<unknown>(`/cards/${encodeURIComponent(id)}`);
        return mapTcgdexCard(raw);
      } catch (error) {
        if (error instanceof TcgRequestError && error.status === 404) return null;
        throw error;
      }
    }),
  );
  return results.flatMap((card) => (card ? [card] : []));
}

export async function searchTcgdex(
  query: ExploreParams,
): Promise<{ cards: Card[]; totalCount: number; catalogCount: number }> {
  const pageSize = query.pageSize;
  const briefs = await listCardBriefs(query, query.page, pageSize + 1);
  const hasMore = briefs.length > pageSize;
  const pageBriefs = briefs.slice(0, pageSize);
  const cards = await hydrateCards(pageBriefs.map((item) => item.id.trim()));

  const totalCount = hasMore
    ? query.page * pageSize + 1
    : (query.page - 1) * pageSize + pageBriefs.length;

  return {
    cards,
    totalCount,
    catalogCount: await getTcgdexCatalogCount(),
  };
}

export async function getTcgdexCatalogCount(): Promise<number> {
  let total = 0;
  let page = 1;

  while (true) {
    const batch = await tcgdexFetch<CardBrief[]>("/cards", {
      "pagination:page": page,
      "pagination:itemsPerPage": 100,
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    total += batch.length;
    if (batch.length < 100) break;
    page += 1;
    if (page > 500) break;
  }

  return total;
}

export async function getTcgdexCard(id: string): Promise<Card | null> {
  try {
    const raw = await tcgdexFetch<unknown>(`/cards/${encodeURIComponent(id)}`);
    return mapTcgdexCard(raw);
  } catch (error) {
    if (error instanceof TcgRequestError && error.status === 404) return null;
    throw error;
  }
}

export async function getTcgdexCardsByIds(ids: string[]): Promise<Card[]> {
  return hydrateCards(ids);
}

export async function getTcgdexSets(): Promise<CardSet[]> {
  const sets: CardSet[] = [];
  let page = 1;

  while (true) {
    const batch = await tcgdexFetch<unknown[]>("/sets", {
      "pagination:page": page,
      "pagination:itemsPerPage": 100,
      "sort:field": "releaseDate",
      "sort:order": "DESC",
    });
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const item of batch) {
      const set = mapTcgdexSet(item);
      if (set) sets.push(set);
    }

    if (batch.length < 100) break;
    page += 1;
  }

  return sets;
}

async function hydrateTcgdexSetDetails(sets: CardSet[]): Promise<CardSet[]> {
  const concurrency = 12;
  const hydrated: CardSet[] = [];

  for (let index = 0; index < sets.length; index += concurrency) {
    const chunk = sets.slice(index, index + concurrency);
    const batch = await Promise.all(
      chunk.map(async (set) => {
        if (set.releaseDate) return set;
        try {
          const raw = await tcgdexFetch<unknown>(`/sets/${encodeURIComponent(set.id)}`);
          return mapTcgdexSet(raw) ?? set;
        } catch (error) {
          if (error instanceof TcgRequestError && error.status === 404) return set;
          throw error;
        }
      }),
    );
    hydrated.push(...batch);
  }

  return hydrated;
}

export function applySetReleaseDates(cards: Card[], sets: CardSet[]): void {
  const bySetId = new Map(sets.map((set) => [set.id, set.releaseDate]));
  for (const card of cards) {
    const releaseDate = bySetId.get(card.set.id);
    if (releaseDate) card.set.releaseDate = releaseDate;
  }
}

export async function fetchAllTcgdexSetsForSync(): Promise<CardSet[]> {
  const listed = await getTcgdexSets();
  return hydrateTcgdexSetDetails(listed);
}

export async function fetchAllTcgdexCardsForSync(
  onProgress?: (loaded: number) => void,
): Promise<Card[]> {
  const ids: string[] = [];
  let page = 1;

  while (true) {
    const batch = await tcgdexFetch<CardBrief[]>("/cards", {
      "pagination:page": page,
      "pagination:itemsPerPage": 100,
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    ids.push(...batch.map((item) => item.id.trim()));
    if (batch.length < 100) break;
    page += 1;
    if (page > 500) break;
  }

  const cards: Card[] = [];
  const concurrency = 8;

  for (let index = 0; index < ids.length; index += concurrency) {
    const chunk = ids.slice(index, index + concurrency);
    const mapped = await hydrateCards(chunk);
    cards.push(...mapped);
    onProgress?.(cards.length);
  }

  return cards;
}
