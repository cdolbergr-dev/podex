import {
  getTcgdexCard,
  getTcgdexCardsByIds,
  getTcgdexCatalogCount,
  getTcgdexSets,
  searchTcgdex,
} from "@/lib/tcg/tcgdex/queries";
import type { Card, CardSet, ExploreParams } from "@/types/catalog";

export async function searchLive(query: ExploreParams): Promise<{ cards: Card[]; totalCount: number }> {
  const result = await searchTcgdex(query);
  return { cards: result.cards, totalCount: result.totalCount };
}

export async function getLiveCatalogCount(): Promise<number> {
  return getTcgdexCatalogCount();
}

export async function getLiveCard(id: string): Promise<Card | null> {
  return getTcgdexCard(id);
}

export async function getLiveCardsByIds(ids: string[]): Promise<Card[]> {
  return getTcgdexCardsByIds(ids);
}

export async function getLiveSets(): Promise<CardSet[]> {
  return getTcgdexSets();
}
