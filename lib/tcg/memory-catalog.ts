import { RARITIES } from "@/lib/tcg/constants";
import { searchTerms } from "@/lib/tcg/search-terms";
import { sortExploreCards } from "@/lib/tcg/sort-cards";
import type { Card, CardSet, ExploreParams } from "@/types/catalog";

type SearchResult = { cards: Card[]; totalCount: number; catalogCount: number };

function readCard(value: unknown): Card | null {
  if (!value || typeof value !== "object") return null;
  const card = value as Card;
  if (!card.id || !card.name || !card.set?.id || !card.number || !card.images) return null;
  return card;
}

function readSet(value: unknown): CardSet | null {
  if (!value || typeof value !== "object") return null;
  const set = value as CardSet;
  if (!set.id || !set.name || !set.images) return null;
  return set;
}

/**
 * A catalog held in memory: search, filters and sorts with the same results as the database.
 * Each sort order is computed once on first use (sorting ~24k cards by set, release date and
 * evolution line is the expensive part); searches then filter the pre-sorted list.
 */
export class MemoryCatalog {
  readonly cards: Card[];
  readonly sets: CardSet[];
  private readonly byId: Map<string, Card>;
  /** Series per set id: cards' embedded set info often lacks it (the database joins tcg_sets). */
  private readonly seriesBySet: Map<string, string>;
  private readonly sorted = new Map<ExploreParams["sort"], Card[]>();
  private readonly haystacks = new Map<string, string>();

  constructor(rawCards: unknown[], rawSets: unknown[]) {
    this.cards = rawCards.map(readCard).filter((card): card is Card => card !== null);
    this.sets = rawSets
      .map(readSet)
      .filter((set): set is CardSet => set !== null)
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
    this.byId = new Map(this.cards.map((card) => [card.id, card]));
    this.seriesBySet = new Map(this.sets.map((set) => [set.id, set.series]));
  }

  private sortedBy(sort: ExploreParams["sort"]): Card[] {
    let list = this.sorted.get(sort);
    if (!list) {
      list = sortExploreCards(this.cards, sort);
      this.sorted.set(sort, list);
    }
    return list;
  }

  private haystack(card: Card): string {
    let text = this.haystacks.get(card.id);
    if (text === undefined) {
      const series = this.seriesBySet.get(card.set.id) || card.set.series;
      text = [card.name, card.set.name, series, card.number].join(" ").toLowerCase();
      this.haystacks.set(card.id, text);
    }
    return text;
  }

  private matches(card: Card, query: ExploreParams, terms: string[]): boolean {
    if (query.set && card.set.id !== query.set) return false;
    if (query.type && !card.types.some((type) => type.toLowerCase() === query.type.toLowerCase())) return false;
    if (query.rarity && card.rarity?.toLowerCase() !== query.rarity.toLowerCase()) return false;
    if (terms.length === 0) return true;
    const text = this.haystack(card);
    return terms.every((term) => text.includes(term));
  }

  search(query: ExploreParams): SearchResult {
    const terms = searchTerms(query.q);
    const matched = this.sortedBy(query.sort).filter((card) => this.matches(card, query, terms));
    const start = (query.page - 1) * query.pageSize;
    return {
      cards: matched.slice(start, start + query.pageSize),
      totalCount: matched.length,
      catalogCount: this.cards.length,
    };
  }

  card(id: string): Card | null {
    return this.byId.get(id) ?? null;
  }

  cardsByIds(ids: string[]): Card[] {
    return ids.flatMap((id) => this.byId.get(id) ?? []);
  }

  cardIds(): string[] {
    return this.cards.map((card) => card.id);
  }

  searchNames(): string[] {
    return [...new Set([...this.cards.map((card) => card.name), ...this.sets.map((set) => set.name)])];
  }

  rarities(): string[] {
    const present = new Set(this.cards.flatMap((card) => (card.rarity ? [card.rarity] : [])));
    const known = RARITIES.filter((rarity) => present.has(rarity));
    const extra = [...present].filter((rarity) => !RARITIES.includes(rarity as (typeof RARITIES)[number]));
    return [...known, ...extra.sort((a, b) => a.localeCompare(b))];
  }
}
