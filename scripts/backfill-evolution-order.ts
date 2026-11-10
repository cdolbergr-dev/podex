import type { RowDataPacket } from "@/lib/db/client";
import { getPool } from "@/lib/db/client";
import { loadProjectEnv } from "@/lib/load-env";
import { buildSetEvolutionSortMeta } from "@/lib/tcg/evolution-order";
import type { Card } from "@/types/catalog";

loadProjectEnv();

async function ensureColumns() {
  const pool = getPool();
  const alters = [
    "ALTER TABLE tcg_cards ADD COLUMN evolution_line_sort INT NOT NULL DEFAULT 999999",
    "ALTER TABLE tcg_cards ADD COLUMN evolution_depth SMALLINT UNSIGNED NOT NULL DEFAULT 0",
    "CREATE INDEX idx_tcg_cards_set_evolution ON tcg_cards (set_id, evolution_line_sort, evolution_depth)",
  ];

  for (const statement of alters) {
    try {
      await pool.query(statement);
    } catch {
      // Column or index may already exist.
    }
  }
}

function readCard(payload: unknown): Card | null {
  if (!payload) return null;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Card;
    } catch {
      return null;
    }
  }
  if (typeof payload === "object") return payload as Card;
  return null;
}

async function main() {
  await ensureColumns();
  const pool = getPool();
  const [setRows] = await pool.query<RowDataPacket[]>("SELECT id FROM tcg_sets ORDER BY id ASC");

  for (const setRow of setRows) {
    const setId = String(setRow.id);
    const [cardRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, payload FROM tcg_cards WHERE set_id = ?",
      [setId],
    );
    const cards = cardRows.flatMap((row) => {
      const card = readCard(row.payload);
      return card ? [card] : [];
    });
    const meta = buildSetEvolutionSortMeta(cards);

    for (const row of cardRows) {
      const id = String(row.id);
      const evolution = meta.get(id) ?? { lineSort: 999_999, depth: 0 };
      await pool.execute(
        "UPDATE tcg_cards SET evolution_line_sort = ?, evolution_depth = ? WHERE id = ?",
        [evolution.lineSort, evolution.depth, id],
      );
    }
  }

  console.log(`Evolution order backfilled for ${setRows.length} sets.`);
  await pool.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
