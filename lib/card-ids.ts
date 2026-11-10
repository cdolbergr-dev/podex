/** Catalog ids look like "base1-4" or "sv03.5-12": letters, digits, dots and dashes. */
export function isValidCardId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 80 && /^[a-z0-9][a-z0-9.-]*$/i.test(value);
}

export const MAX_SHARED_CARDS = 200;

/** Ids from a `?cards=a,b,c` share link: valid, unique, capped. */
export function parseSharedCardIds(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw.join(",") : (raw ?? "");
  return [...new Set(value.split(",").map((id) => id.trim()).filter(isValidCardId))].slice(0, MAX_SHARED_CARDS);
}

/** Share link for a list: its cards, and its name when given. */
export function sharedFavoritesPath(ids: string[], name?: string): string {
  const cards = ids.slice(0, MAX_SHARED_CARDS).map(encodeURIComponent).join(",");
  return `/favorites/shared?cards=${cards}${name ? `&name=${encodeURIComponent(name)}` : ""}`;
}

/** List name from a share link, tidied; empty when missing. */
export function parseSharedListName(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
}
