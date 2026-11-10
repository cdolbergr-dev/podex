import { sortCardsInSetByEvolution } from "@/lib/tcg/evolution-order";
import { isCatalogSetSort } from "@/lib/tcg/explore-default-sort";
import type { Card, ExploreParams } from "@/types/catalog";

function compareReleaseDate(sort: ExploreParams["sort"], a: Card, b: Card): number {
  const left = a.set.releaseDate ?? "";
  const right = b.set.releaseDate ?? "";
  return sort === "newest" ? right.localeCompare(left) : left.localeCompare(right);
}

function compareNumber(a: Card, b: Card): number {
  return a.number.localeCompare(b.number, undefined, { numeric: true }) || a.name.localeCompare(b.name);
}

export function compareExploreCards(sort: ExploreParams["sort"], a: Card, b: Card): number {
  // Same-named cards group by set, then number (matches the database's ORDER BY).
  if (sort === "name") return a.name.localeCompare(b.name) || a.set.id.localeCompare(b.set.id) || compareNumber(a, b);
  if (sort === "number") return compareNumber(a, b);
  return 0;
}

/** Matches {@link catalogSetSortOrderSql}: release date → set id → evolution within set. */
function sortBySetReleaseThenEvolution(cards: Card[], sort: "oldest" | "newest"): Card[] {
  const bySet = new Map<string, Card[]>();
  for (const card of cards) {
    const list = bySet.get(card.set.id) ?? [];
    list.push(card);
    bySet.set(card.set.id, list);
  }

  const setGroups = [...bySet.entries()].map(([setId, setCards]) => ({
    setId,
    releaseDate: setCards[0]?.set.releaseDate ?? "",
    cards: sortCardsInSetByEvolution(setCards),
  }));

  setGroups.sort((a, b) => {
    const byDate = compareReleaseDate(sort, a.cards[0], b.cards[0]);
    if (byDate !== 0) return byDate;
    return a.setId.localeCompare(b.setId);
  });

  return setGroups.flatMap((group) => group.cards);
}

/** Cards without artwork sink to the end of every sort (matches the database ordering). */
export function sortExploreCards(cards: Card[], sort: ExploreParams["sort"]): Card[] {
  const sorted = sortExploreCardsByKey(cards, sort);
  const hasArt = (card: Card) => Boolean(card.images.small || card.images.large);
  return [...sorted.filter(hasArt), ...sorted.filter((card) => !hasArt(card))];
}

function sortExploreCardsByKey(cards: Card[], sort: ExploreParams["sort"]): Card[] {
  if (sort === "name" || sort === "number") {
    return [...cards].sort((a, b) => compareExploreCards(sort, a, b));
  }
  if (isCatalogSetSort(sort)) {
    return sortBySetReleaseThenEvolution(cards, sort);
  }
  return sortBySetReleaseThenEvolution(cards, "oldest");
}
