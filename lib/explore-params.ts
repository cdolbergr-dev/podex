import { stripLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, PAGE_SIZE_OPTIONS } from "@/lib/tcg/constants";
import type { ExploreParams, SortKey } from "@/types/catalog";

const SORTS = new Set<SortKey>(["oldest", "newest", "name", "number"]);
const PAGE_SIZES = new Set<number>(PAGE_SIZE_OPTIONS);

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseExploreParams(
  raw: Record<string, string | string[] | undefined>,
): ExploreParams {
  const sortRaw = first(raw.sort) as SortKey;
  const pageRaw = Number.parseInt(first(raw.page), 10);
  const perRaw = Number.parseInt(first(raw.per), 10);
  const pageSize =
    Number.isFinite(perRaw) && PAGE_SIZES.has(perRaw) ? perRaw : DEFAULT_PAGE_SIZE;

  return {
    q: first(raw.q).trim().slice(0, 80),
    set: first(raw.set).trim().slice(0, 64),
    type: first(raw.type).trim().slice(0, 32),
    rarity: first(raw.rarity).trim().slice(0, 64),
    sort: SORTS.has(sortRaw) ? sortRaw : DEFAULT_SORT,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 10000) : 1,
    pageSize,
  };
}

export function buildExploreHref(
  current: ExploreParams,
  patch: Partial<ExploreParams> = {},
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.set) params.set("set", next.set);
  if (next.type) params.set("type", next.type);
  if (next.rarity) params.set("rarity", next.rarity);
  if (next.sort !== DEFAULT_SORT) params.set("sort", next.sort);
  if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set("per", String(next.pageSize));
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function cardHref(id: string, returnTo?: string): string {
  const path = `/cards/${encodeURIComponent(id)}`;
  if (!returnTo || returnTo === "/") return path;
  return `${path}?return=${encodeURIComponent(returnTo)}`;
}

export function safeReturnPath(value: string | undefined): string {
  if (!value) return "/";

  try {
    const url = new URL(value, "https://podex.local");
    if (url.origin !== "https://podex.local") return "/";
    const path = stripLocale(url.pathname);
    const listPage = ["/", "/favorites", "/favorites/shared", "/sets", "/pokemon", "/artists"].includes(path);
    if (!listPage && !/^\/(pokemon|artists)\/[a-z0-9-]+$/.test(path)) {
      return "/";
    }
    return `${path}${url.search}`;
  } catch {
    return "/";
  }
}

/** `path` is a site path without a language prefix (see safeReturnPath). */
export function returnLabel(path: string, t: Dictionary): string {
  if (path.startsWith("/favorites/shared")) return t.card.backToShared;
  if (path.startsWith("/favorites")) return t.card.backToFavorites;
  if (path.startsWith("/sets")) return t.card.backToSets;
  if (path.startsWith("/pokemon")) return t.card.backToPokemon;
  if (path.startsWith("/artists")) return t.card.backToArtist;
  return t.card.backToExplore;
}
