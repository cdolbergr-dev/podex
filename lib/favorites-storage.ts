/** Named favorite lists, saved in this browser. Supersedes the single `podex.favorites` array. */
export const FAVORITE_LISTS_STORAGE_KEY = "podex.favoriteLists";
/** Pre-lists storage: one flat array of card ids. Migrated into the first list on first read. */
export const LEGACY_FAVORITES_STORAGE_KEY = "podex.favorites";
export const FAVORITES_CHANGE_EVENT = "podex-favorites-change";

export const DEFAULT_LIST_NAME = "Favorites";
/** Upper bound on cards marked as owned (a full collection, with room to spare). */
export const MAX_OWNED_CARDS = 30_000;
export const MAX_LIST_NAME_LENGTH = 40;

export type FavoriteList = {
  id: string;
  name: string;
  cardIds: string[];
};

export function isCardId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 80;
}

/** Unique, valid card ids from untrusted input. */
export function cleanCardIds(value: unknown, max = MAX_OWNED_CARDS): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isCardId))].slice(0, max) : [];
}

export function cleanListName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_LIST_NAME_LENGTH);
}

export function newListId(): string {
  return `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultList(cardIds: string[] = []): FavoriteList {
  return { id: "favorites", name: DEFAULT_LIST_NAME, cardIds };
}

function parseLists(value: unknown): FavoriteList[] | null {
  if (!value || typeof value !== "object" || !Array.isArray((value as { lists?: unknown }).lists)) return null;
  const seen = new Set<string>();
  const lists: FavoriteList[] = [];
  for (const raw of (value as { lists: unknown[] }).lists) {
    if (!raw || typeof raw !== "object") continue;
    const { id, name, cardIds } = raw as Partial<FavoriteList>;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    seen.add(id);
    lists.push({
      id,
      name: cleanListName(typeof name === "string" ? name : "") || DEFAULT_LIST_NAME,
      cardIds: Array.isArray(cardIds) ? [...new Set(cardIds.filter(isCardId))] : [],
    });
  }
  return lists.length > 0 ? lists : null;
}

function parseLegacyIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isCardId))] : [];
  } catch {
    return [];
  }
}

/**
 * Raw storage for useSyncExternalStore: the lists JSON, or the legacy array tagged so the
 * snapshot changes when either key does. Always at least one list once parsed.
 */
export function readFavoriteSnapshot(): string {
  const lists = window.localStorage.getItem(FAVORITE_LISTS_STORAGE_KEY);
  if (lists) return lists;
  return `legacy:${window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY) ?? "[]"}`;
}

export function parseFavoriteSnapshot(snapshot: string): FavoriteList[] {
  if (snapshot.startsWith("legacy:")) return [defaultList(parseLegacyIds(snapshot.slice("legacy:".length)))];
  try {
    return parseLists(JSON.parse(snapshot)) ?? [defaultList()];
  } catch {
    return [defaultList()];
  }
}

/** Cards marked "I own this", stored next to the lists in the same entry. */
export function parseOwnedSnapshot(snapshot: string): string[] {
  if (snapshot.startsWith("legacy:")) return [];
  try {
    return cleanCardIds((JSON.parse(snapshot) as { owned?: unknown }).owned);
  } catch {
    return [];
  }
}

/** False when this browser holds no favorites data at all (never saved, or wiped). */
export function hasStoredFavorites(): boolean {
  try {
    return (
      window.localStorage.getItem(FAVORITE_LISTS_STORAGE_KEY) !== null ||
      window.localStorage.getItem(LEGACY_FAVORITES_STORAGE_KEY) !== null
    );
  } catch {
    return true; // Storage unreadable: don't try to restore over it.
  }
}

/** Turns backed-up lists into stored lists (the first keeps the default id). */
export function listsFromBackup(lists: { name: string; cardIds: string[] }[]): FavoriteList[] {
  return lists.map((list, index) => ({
    id: index === 0 ? "favorites" : newListId(),
    name: cleanListName(list.name) || DEFAULT_LIST_NAME,
    cardIds: list.cardIds,
  }));
}

export function readFavoriteLists(): FavoriteList[] {
  if (typeof window === "undefined") return [defaultList()];
  try {
    return parseFavoriteSnapshot(readFavoriteSnapshot());
  } catch {
    return [defaultList()];
  }
}

export function readOwnedCards(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return parseOwnedSnapshot(readFavoriteSnapshot());
  } catch {
    return [];
  }
}

/** Writes lists and owned cards together; omitting `owned` keeps the stored ones. */
export function writeFavoriteLists(lists: FavoriteList[], owned: string[] = readOwnedCards()): void {
  window.localStorage.setItem(FAVORITE_LISTS_STORAGE_KEY, JSON.stringify({ version: 1, lists, owned }));
  // The lists key is now the source of truth; drop the legacy array so it can't resurface.
  window.localStorage.removeItem(LEGACY_FAVORITES_STORAGE_KEY);
  window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
}
