import type { Card } from "@/types/catalog";

export type EvolutionSortMeta = {
  lineSort: number;
  depth: number;
};

function numericCardNumber(value: string): number {
  const trimmed = value.trim();
  if (/^[0-9]+$/.test(trimmed)) return Number.parseInt(trimmed, 10);
  return 999_999;
}

function stageDepth(card: Card): number {
  const subtype = card.subtypes.join(" ").toLowerCase();
  if (subtype.includes("stage2")) return 2;
  if (subtype.includes("stage1")) return 1;
  if (subtype.includes("basic")) return 0;
  return card.evolvesFrom ? 1 : 0;
}

function isPokemonCard(card: Card): boolean {
  return card.supertype === "Pokémon" || card.types.length > 0;
}

/** Evolution-aware order within one set. */
export function buildSetEvolutionSortMeta(cardsInSet: Card[]): Map<string, EvolutionSortMeta> {
  const meta = new Map<string, EvolutionSortMeta>();
  const pokemon = cardsInSet.filter(isPokemonCard);

  const byName = new Map<string, Card>();
  for (const card of pokemon) {
    if (!byName.has(card.name)) byName.set(card.name, card);
  }

  function resolveParent(card: Card): Card | undefined {
    if (!card.evolvesFrom) return undefined;
    return byName.get(card.evolvesFrom.trim());
  }

  function lineRoot(card: Card): Card {
    let current = card;
    const seen = new Set<string>();
    while (true) {
      const parent = resolveParent(current);
      if (!parent || seen.has(parent.id)) break;
      seen.add(current.id);
      current = parent;
    }
    return current;
  }

  function evolutionDepth(card: Card): number {
    let depth = 0;
    let current = card;
    const seen = new Set<string>();
    while (true) {
      const parent = resolveParent(current);
      if (!parent || seen.has(parent.id)) break;
      seen.add(current.id);
      depth += 1;
      current = parent;
    }
    return Math.max(depth, stageDepth(card));
  }

  const lineMembers = new Map<string, Card[]>();
  for (const card of pokemon) {
    const root = lineRoot(card);
    const lineKey = root.name;
    const list = lineMembers.get(lineKey) ?? [];
    list.push(card);
    lineMembers.set(lineKey, list);
  }

  const lineSortByKey = new Map<string, number>();
  for (const [lineKey, members] of lineMembers) {
    const rootCard = members.find((card) => lineRoot(card).name === lineKey && !resolveParent(card));
    const basics = members.filter((card) => !resolveParent(card));
    const anchor = rootCard ?? basics[0] ?? members[0];
    lineSortByKey.set(lineKey, numericCardNumber(anchor.number));
  }

  for (const card of pokemon) {
    const root = lineRoot(card);
    meta.set(card.id, {
      lineSort: lineSortByKey.get(root.name) ?? numericCardNumber(card.number),
      depth: evolutionDepth(card),
    });
  }

  const nonPokemonBase = 900_000;
  for (const card of cardsInSet) {
    if (meta.has(card.id)) continue;
    meta.set(card.id, {
      lineSort: nonPokemonBase + numericCardNumber(card.number),
      depth: 0,
    });
  }

  return meta;
}

export function sortCardsInSetByEvolution(cardsInSet: Card[]): Card[] {
  const meta = buildSetEvolutionSortMeta(cardsInSet);
  return [...cardsInSet].sort((a, b) => {
    const left = meta.get(a.id)!;
    const right = meta.get(b.id)!;
    if (left.lineSort !== right.lineSort) return left.lineSort - right.lineSort;
    if (left.depth !== right.depth) return left.depth - right.depth;
    return (
      numericCardNumber(a.number) - numericCardNumber(b.number) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id)
    );
  });
}
