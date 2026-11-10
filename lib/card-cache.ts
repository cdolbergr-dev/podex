import type { Card } from "@/types/catalog";

/**
 * Client-only memory of cards the grid has already rendered, so an opened card can show
 * its details before the route's own fetch resolves. Never populate this on the server —
 * module state there is shared across requests.
 */
const MAX_CARDS = 500;
const cards = new Map<string, Card>();

export function rememberCards(list: Card[]) {
  for (const card of list) {
    cards.delete(card.id);
    cards.set(card.id, card);
  }
  while (cards.size > MAX_CARDS) {
    const oldest = cards.keys().next().value;
    if (oldest === undefined) break;
    cards.delete(oldest);
  }
}

export function getRememberedCard(id: string): Card | null {
  return cards.get(id) ?? null;
}

/** Order of the grid the user is browsing, for previous/next inside the card modal. */
let browseOrder: string[] = [];

export function setBrowseOrder(ids: string[]) {
  browseOrder = ids;
}

export function getBrowseNeighbors(id: string): { prev: string | null; next: string | null } {
  const index = browseOrder.indexOf(id);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? browseOrder[index - 1] : null,
    next: index < browseOrder.length - 1 ? browseOrder[index + 1] : null,
  };
}
