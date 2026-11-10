const STORAGE_KEY = "podex.recentSearches";
const MAX_RECENT = 5;

export function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Most recent first; case-insensitive duplicates collapse onto the newest spelling. */
export function rememberSearch(query: string): string[] {
  const trimmed = query.trim().slice(0, 80);
  const current = readRecentSearches();
  if (trimmed.length < 2) return current;

  const next = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full — recents are a nicety.
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
