export type EnergyType =
  | "Grass"
  | "Fire"
  | "Water"
  | "Lightning"
  | "Psychic"
  | "Fighting"
  | "Darkness"
  | "Metal"
  | "Dragon"
  | "Colorless"
  | "Fairy"
  | (string & {});

export type CardAbility = {
  name: string;
  text: string;
  type: string;
};

export type CardAttack = {
  name: string;
  cost: string[];
  convertedEnergyCost: number;
  damage: string;
  text: string;
};

export type CardEffect = {
  type: string;
  value: string;
};

export type CardImages = {
  symbol: string;
  logo: string;
};

export type CardSet = {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images: CardImages;
};

export type CardLegalities = {
  standard?: string;
  expanded?: string;
  unlimited?: string;
};

export type Card = {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types: string[];
  evolvesFrom?: string;
  evolvesTo?: string[];
  rules?: string[];
  abilities?: CardAbility[];
  attacks?: CardAttack[];
  weaknesses?: CardEffect[];
  resistances?: CardEffect[];
  retreatCost?: string[];
  convertedRetreatCost?: number;
  set: CardSet;
  number: string;
  artist?: string;
  rarity?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  legalities?: CardLegalities;
  images: {
    small: string;
    large: string;
  };
};

export type CardPriceVariant = {
  label: string;
  price: number;
};

/** Market prices fetched from TCGdex at view time (not stored in the catalog). */
export type CardPrices = {
  tcgplayer?: { currency: "USD"; variants: CardPriceVariant[]; url?: string };
  cardmarket?: { currency: "EUR"; trend: number; avg30?: number };
  updated?: string;
};

export type SortKey = "oldest" | "newest" | "name" | "number";

export type ExploreParams = {
  q: string;
  set: string;
  type: string;
  rarity: string;
  sort: SortKey;
  page: number;
  pageSize: number;
};

export type DataMode = "sample" | "live" | "database" | "static";

export type DataSourceInfo = {
  mode: DataMode;
  label: string;
  notice?: string;
};

export type CardSearchResult = {
  cards: Card[];
  page: number;
  pageSize: number;
  totalCount: number;
  catalogCount: number;
  /** Set when nothing matched the query as typed and a spelling correction did. */
  correctedQuery?: string;
  source: DataSourceInfo;
};

export type FavoriteCardsResult = {
  cards: Card[];
  missingIds: string[];
};
