"use server";

import { isValidCardId, MAX_SHARED_CARDS } from "@/lib/card-ids";
import { parseExploreParams } from "@/lib/explore-params";
import { DEFAULT_PAGE_SIZE } from "@/lib/tcg/constants";
import { getCardsByIds, searchCards } from "@/lib/tcg/service";
import type { Card, ExploreParams, FavoriteCardsResult } from "@/types/catalog";

function cleanIds(ids: string[]): string[] {
  return ids.filter(isValidCardId).slice(0, MAX_SHARED_CARDS);
}

export async function loadFavoriteCards(ids: string[]): Promise<FavoriteCardsResult> {
  if (!Array.isArray(ids)) return { cards: [], missingIds: [] };
  return getCardsByIds(cleanIds(ids));
}

/** Next page of explore results for "Load more". Re-parses params so client input stays bounded. */
export async function loadMoreExploreCards(params: ExploreParams, page: number): Promise<Card[]> {
  const query = parseExploreParams({
    q: String(params?.q ?? ""),
    set: String(params?.set ?? ""),
    type: String(params?.type ?? ""),
    rarity: String(params?.rarity ?? ""),
    sort: String(params?.sort ?? ""),
  });
  const safePage = Number.isInteger(page) && page > 1 ? Math.min(page, 10000) : 2;
  const result = await searchCards({ ...query, page: safePage, pageSize: DEFAULT_PAGE_SIZE });
  return result.cards;
}
