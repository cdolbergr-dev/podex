import type { RowDataPacket } from "@/lib/db/client";
import { getPool } from "@/lib/db/client";
import { loadProjectEnv } from "@/lib/load-env";
import { tcgdexFetch } from "@/lib/tcg/tcgdex/client";
import { mapTcgdexSet } from "@/lib/tcg/tcgdex/map";

loadProjectEnv();

async function main() {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM tcg_sets ORDER BY id ASC");
  let updated = 0;

  for (const row of rows) {
    const id = String(row.id);
    const raw = await tcgdexFetch<unknown>(`/sets/${encodeURIComponent(id)}`);
    const set = mapTcgdexSet(raw);
    const releaseDate = set?.releaseDate;
    if (!releaseDate) continue;

    await pool.execute("UPDATE tcg_sets SET release_date = ? WHERE id = ?", [releaseDate, id]);
    await pool.execute(
      `UPDATE tcg_cards
       SET release_date = ?, payload = JSON_SET(payload, '$.set.releaseDate', ?)
       WHERE set_id = ?`,
      [releaseDate, releaseDate, id],
    );
    updated += 1;
    process.stdout.write(`\rUpdated ${updated}/${rows.length} sets…`);
  }

  process.stdout.write("\n");
  console.log(`Release dates backfilled for ${updated} sets.`);
  await pool.end();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
