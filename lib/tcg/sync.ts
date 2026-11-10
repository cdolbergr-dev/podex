import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/client";
import { TcgRequestError } from "@/lib/tcg/errors";
import {
  applySetReleaseDates,
  fetchAllTcgdexCardsForSync,
  fetchAllTcgdexSetsForSync,
} from "@/lib/tcg/tcgdex/queries";
import { buildSetEvolutionSortMeta } from "@/lib/tcg/evolution-order";
import type { Card, CardSet } from "@/types/catalog";

function buildEvolutionMetaByCardId(cards: Card[]): Map<string, { lineSort: number; depth: number }> {
  const bySet = new Map<string, Card[]>();
  for (const card of cards) {
    const list = bySet.get(card.set.id) ?? [];
    list.push(card);
    bySet.set(card.set.id, list);
  }

  const result = new Map<string, { lineSort: number; depth: number }>();
  for (const setCards of bySet.values()) {
    for (const [id, meta] of buildSetEvolutionSortMeta(setCards)) {
      result.set(id, meta);
    }
  }
  return result;
}

async function markSyncRunning(): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `UPDATE tcg_catalog_sync
     SET status = 'running', started_at = UTC_TIMESTAMP(), finished_at = NULL, error_message = NULL
     WHERE id = 1`,
  );
}

async function markSyncSuccess(cardCount: number, setCount: number): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `UPDATE tcg_catalog_sync
     SET status = 'success', finished_at = UTC_TIMESTAMP(), card_count = ?, set_count = ?, error_message = NULL
     WHERE id = 1`,
    [cardCount, setCount],
  );
}

async function markSyncFailed(message: string): Promise<void> {
  const pool = getPool();
  await pool.execute(
    `UPDATE tcg_catalog_sync
     SET status = 'failed', finished_at = UTC_TIMESTAMP(), error_message = ?
     WHERE id = 1`,
    [message.slice(0, 2000)],
  );
}

async function upsertCatalog(sets: CardSet[], cards: Card[], syncToken: string): Promise<void> {
  const pool = getPool();
  const connection = await pool.getConnection();
  const evolutionMeta = buildEvolutionMetaByCardId(cards);

  try {
    await connection.beginTransaction();

    for (const set of sets) {
      await connection.execute(
        `INSERT INTO tcg_sets (id, name, series, printed_total, total, release_date, symbol_url, logo_url, sync_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           series = VALUES(series),
           printed_total = VALUES(printed_total),
           total = VALUES(total),
           release_date = VALUES(release_date),
           symbol_url = VALUES(symbol_url),
           logo_url = VALUES(logo_url),
           sync_token = VALUES(sync_token)`,
        [
          set.id,
          set.name,
          set.series,
          set.printedTotal ?? null,
          set.total ?? null,
          set.releaseDate ?? null,
          set.images.symbol,
          set.images.logo,
          syncToken,
        ],
      );
    }

    for (const card of cards) {
      const evolution = evolutionMeta.get(card.id) ?? { lineSort: 999_999, depth: 0 };
      await connection.execute(
        `INSERT INTO tcg_cards (id, set_id, name, number, rarity, types, release_date, evolution_line_sort, evolution_depth, payload, sync_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           set_id = VALUES(set_id),
           name = VALUES(name),
           number = VALUES(number),
           rarity = VALUES(rarity),
           types = VALUES(types),
           release_date = VALUES(release_date),
           evolution_line_sort = VALUES(evolution_line_sort),
           evolution_depth = VALUES(evolution_depth),
           payload = VALUES(payload),
           sync_token = VALUES(sync_token)`,
        [
          card.id,
          card.set.id,
          card.name,
          card.number,
          card.rarity ?? null,
          JSON.stringify(card.types),
          card.set.releaseDate ?? null,
          evolution.lineSort,
          evolution.depth,
          JSON.stringify(card),
          syncToken,
        ],
      );
    }

    await connection.execute("DELETE FROM tcg_cards WHERE sync_token IS NULL OR sync_token <> ?", [syncToken]);
    await connection.execute("DELETE FROM tcg_sets WHERE sync_token IS NULL OR sync_token <> ?", [syncToken]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export type SyncCatalogResult = {
  cardCount: number;
  setCount: number;
  syncToken: string;
};

export async function syncCatalogFromApi(): Promise<SyncCatalogResult> {
  const syncToken = randomUUID();
  await markSyncRunning();

  try {
    const sets = await fetchAllTcgdexSetsForSync();
    const cards = await fetchAllTcgdexCardsForSync();
    applySetReleaseDates(cards, sets);
    await upsertCatalog(sets, cards, syncToken);
    await markSyncSuccess(cards.length, sets.length);
    return { cardCount: cards.length, setCount: sets.length, syncToken };
  } catch (error) {
    const message =
      error instanceof TcgRequestError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Catalog sync failed.";
    await markSyncFailed(message);
    throw error;
  }
}
