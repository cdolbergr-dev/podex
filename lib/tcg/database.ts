import { getPool, type RowDataPacket } from "@/lib/db/client";
import { RARITIES } from "@/lib/tcg/constants";
import { catalogSetSortOrderSql, isCatalogSetSort } from "@/lib/tcg/explore-default-sort";
import { TcgRequestError } from "@/lib/tcg/errors";
import type { Card, CardSet, ExploreParams } from "@/types/catalog";
import { searchTerms } from "@/lib/tcg/search-terms";

type SyncStatusRow = RowDataPacket & {
  status: string;
  started_at: Date | null;
  finished_at: Date | null;
  card_count: number | null;
  set_count: number | null;
  error_message: string | null;
};

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function parseCardPayload(value: unknown): Card | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Card;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Card;
  return null;
}

function buildWhere(query: ExploreParams): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (query.set) {
    parts.push("c.set_id = ?");
    params.push(query.set);
  }

  if (query.type) {
    parts.push("JSON_CONTAINS(c.types, JSON_QUOTE(?), '$')");
    params.push(query.type);
  }

  if (query.rarity) {
    parts.push("LOWER(c.rarity) = LOWER(?)");
    params.push(query.rarity);
  }

  for (const term of searchTerms(query.q)) {
    const like = `%${escapeLike(term)}%`;
    parts.push(
      "(LOWER(c.name) LIKE ? ESCAPE '\\\\' OR LOWER(s.name) LIKE ? ESCAPE '\\\\' OR LOWER(s.series) LIKE ? ESCAPE '\\\\' OR LOWER(c.number) LIKE ? ESCAPE '\\\\')",
    );
    params.push(like, like, like, like);
  }

  const clause = parts.length > 0 ? `WHERE ${parts.join(" AND ")}` : "";
  return { clause, params };
}

function cardNumberSortKey(column: string): string {
  return `(CASE WHEN ${column} REGEXP '^[0-9]+$' THEN CAST(${column} AS UNSIGNED) ELSE 4294967295 END)`;
}

/** Cards without artwork sink to the end of every sort (0 = has art, 1 = missing). */
const MISSING_IMAGE_KEY =
  "(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.payload, '$.images.small')), '') = '' AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(c.payload, '$.images.large')), '') = '')";

function orderByClause(sort: ExploreParams["sort"]): string {
  return baseOrderByClause(sort).replace(/^ORDER BY /, `ORDER BY ${MISSING_IMAGE_KEY} ASC, `);
}

function baseOrderByClause(sort: ExploreParams["sort"]): string {
  const releaseKey = "COALESCE(NULLIF(s.release_date, ''), NULLIF(c.release_date, ''))";
  const numberKey = cardNumberSortKey("c.number");
  if (sort === "name") return "ORDER BY c.name ASC, c.set_id ASC, c.number ASC";
  if (sort === "number") return `ORDER BY c.set_id ASC, ${numberKey} ASC, c.number ASC, c.name ASC`;
  if (isCatalogSetSort(sort)) {
    return catalogSetSortOrderSql(sort, { releaseKey, numberKey });
  }
  return catalogSetSortOrderSql("oldest", { releaseKey, numberKey });
}

export async function getDatabaseCatalogCount(): Promise<number> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS count FROM tcg_cards");
  return Number(rows[0]?.count ?? 0);
}

export async function searchDatabase(
  query: ExploreParams,
): Promise<{ cards: Card[]; totalCount: number; catalogCount: number }> {
  const pool = getPool();
  const catalogCount = await getDatabaseCatalogCount();
  if (catalogCount === 0) {
    throw new TcgRequestError(
      "The local catalog is empty. Run npm run db:migrate and npm run sync-catalog, or wait for the next scheduled sync.",
      503,
    );
  }

  const { clause, params } = buildWhere(query);
  const order = orderByClause(query.sort);
  const pageSize = query.pageSize;
  const offset = (query.page - 1) * pageSize;

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS count
     FROM tcg_cards c
     INNER JOIN tcg_sets s ON s.id = c.set_id
     ${clause}`,
    params,
  );
  const totalCount = Number(countRows[0]?.count ?? 0);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.payload
     FROM tcg_cards c
     INNER JOIN tcg_sets s ON s.id = c.set_id
     ${clause}
     ${order}
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );

  const cards = rows.flatMap((row) => {
    const card = parseCardPayload(row.payload);
    return card ? [card] : [];
  });

  return { cards, totalCount, catalogCount };
}

export async function getDatabaseCard(id: string): Promise<Card | null> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT payload FROM tcg_cards WHERE id = ? LIMIT 1", [id]);
  return parseCardPayload(rows[0]?.payload);
}

/** Distinct card and set names, for spelling suggestions. */
export async function getDatabaseSearchNames(): Promise<string[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT DISTINCT name FROM tcg_cards UNION SELECT name FROM tcg_sets",
  );
  return rows.map((row) => String(row.name));
}

export async function getDatabaseCardIds(): Promise<string[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM tcg_cards ORDER BY id ASC");
  return rows.map((row) => String(row.id));
}

export async function getDatabaseCardsByIds(ids: string[]): Promise<Card[]> {
  if (ids.length === 0) return [];
  const pool = getPool();
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, payload FROM tcg_cards WHERE id IN (${placeholders})`,
    ids,
  );
  const byId = new Map<string, Card>();
  for (const row of rows) {
    const card = parseCardPayload(row.payload);
    if (card) byId.set(String(row.id), card);
  }
  return ids.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
}

export async function getDatabaseSets(): Promise<CardSet[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, series, printed_total, total, release_date, symbol_url, logo_url
     FROM tcg_sets
     ORDER BY release_date DESC, name ASC`,
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    series: String(row.series ?? ""),
    printedTotal: row.printed_total == null ? undefined : Number(row.printed_total),
    total: row.total == null ? undefined : Number(row.total),
    releaseDate: row.release_date == null ? undefined : String(row.release_date),
    images: {
      symbol: String(row.symbol_url ?? ""),
      logo: String(row.logo_url ?? ""),
    },
  }));
}

export async function getDatabaseRarities(): Promise<string[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT DISTINCT rarity FROM tcg_cards WHERE rarity IS NOT NULL AND rarity <> '' ORDER BY rarity ASC",
  );
  const present = new Set(rows.map((row) => String(row.rarity)));
  const known = RARITIES.filter((rarity) => present.has(rarity));
  const extra = [...present].filter((rarity) => !RARITIES.includes(rarity as (typeof RARITIES)[number]));
  return [...known, ...extra.sort((a, b) => a.localeCompare(b))];
}

export async function getDatabaseSyncStatus(): Promise<{
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  cardCount: number | null;
  setCount: number | null;
  errorMessage: string | null;
} | null> {
  const pool = getPool();
  const [rows] = await pool.query<SyncStatusRow[]>(
    "SELECT status, started_at, finished_at, card_count, set_count, error_message FROM tcg_catalog_sync WHERE id = 1 LIMIT 1",
  );
  const row = rows[0];
  if (!row) return null;

  return {
    status: row.status,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    finishedAt: row.finished_at ? row.finished_at.toISOString() : null,
    cardCount: row.card_count,
    setCount: row.set_count,
    errorMessage: row.error_message,
  };
}
