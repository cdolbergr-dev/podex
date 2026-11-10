import type { CardSet } from "@/types/catalog";

/**
 * Card ids are `${setId}-${number}`, but some set ids are prefixes of others ("30th" and
 * "30th-c"), so a set's cards are the ids with its prefix minus those of the longer sets.
 */
export function longerSetIds(set: CardSet, sets: CardSet[]): string[] {
  return sets.filter((other) => other.id.startsWith(`${set.id}-`)).map((other) => other.id);
}

export function countOwnedInSet(owned: string[], setId: string, longer: string[]): number {
  let count = 0;
  for (const id of owned) {
    if (id.startsWith(`${setId}-`) && !longer.some((other) => id.startsWith(`${other}-`))) count++;
  }
  return count;
}

export function setCardTotal(set: CardSet): number {
  return set.total || set.printedTotal || 0;
}
