import type { SortKey } from "@/types/catalog";

export const DEFAULT_PAGE_SIZE = 24;

/** Most "Load more" batches restored from `?page=` when explore renders (240 cards). */
export const MAX_RESTORED_PAGES = 10;

/** @deprecated Use DEFAULT_PAGE_SIZE or query.pageSize */
export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const PAGE_SIZE_OPTIONS = [24, 48, 96] as const;

export const POKEMON_TYPES = [
  "Grass",
  "Fire",
  "Water",
  "Lightning",
  "Psychic",
  "Fighting",
  "Darkness",
  "Metal",
  "Dragon",
  "Colorless",
  "Fairy",
] as const;

export const RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Rare Holo EX",
  "Rare Holo GX",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Ultra",
  "Rare Rainbow",
  "Rare Secret",
  "Double Rare",
  "Ultra Rare",
  "Illustration Rare",
  "Special Illustration Rare",
  "Hyper Rare",
  "ACE SPEC Rare",
  "Shiny Rare",
  "Classic Collection",
  "Promo",
] as const;

/** Release date → set → evolution line (within set). */
export const DEFAULT_SORT: SortKey = "oldest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "oldest", label: "Oldest sets" },
  { value: "newest", label: "Newest sets" },
  { value: "name", label: "Name" },
  { value: "number", label: "Card number" },
];

export const LIVE_SORT: Record<SortKey, string> = {
  oldest: "set.releaseDate,number",
  newest: "-set.releaseDate,number",
  name: "name",
  number: "number",
};

export const CARD_SELECT = [
  "id",
  "name",
  "supertype",
  "subtypes",
  "hp",
  "types",
  "evolvesFrom",
  "evolvesTo",
  "rules",
  "abilities",
  "attacks",
  "weaknesses",
  "resistances",
  "retreatCost",
  "convertedRetreatCost",
  "set",
  "number",
  "artist",
  "rarity",
  "flavorText",
  "nationalPokedexNumbers",
  "legalities",
  "images",
].join(",");

export const SET_SELECT = "id,name,series,printedTotal,total,releaseDate,images";
