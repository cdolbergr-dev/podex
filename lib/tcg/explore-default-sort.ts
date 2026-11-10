import type { SortKey } from "@/types/catalog";

/** Oldest / newest explore sorts — full catalog ordering (not name or card-number sorts). */
export function isCatalogSetSort(sort: SortKey): sort is "oldest" | "newest" {
  return sort === "oldest" || sort === "newest";
}

/**
 * Default explore ordering (oldest & newest):
 * 1. Set release date
 * 2. Set id (stable grouping when dates match)
 * 3. Evolution line and stage within the set
 * 4. Card number, name, and id
 */
export function catalogSetSortOrderSql(
  sort: "oldest" | "newest",
  parts: { releaseKey: string; numberKey: string },
): string {
  const releaseDir = sort === "newest" ? "DESC" : "ASC";
  return [
    `ORDER BY ${parts.releaseKey} ${releaseDir}`,
    "c.set_id ASC",
    "c.evolution_line_sort ASC",
    "c.evolution_depth ASC",
    `${parts.numberKey} ASC`,
    "c.number ASC",
    "c.name ASC",
    "c.id ASC",
  ].join(", ");
}
