import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { closePool } from "../lib/db/client";
import { tcgdexFetch } from "../lib/tcg/tcgdex/client";
import { mapTcgdexCard } from "../lib/tcg/tcgdex/map";
import type { Card, CardSet } from "../types/catalog";
import { loadProjectEnv } from "../lib/load-env";

loadProjectEnv();

type CardBrief = { id: string };

async function listRaichuIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;

  while (true) {
    const batch = await tcgdexFetch<CardBrief[]>("/cards", {
      name: "raichu",
      "pagination:page": page,
      "pagination:itemsPerPage": 100,
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    ids.push(...batch.map((item) => item.id.trim()));
    if (batch.length < 100) break;
    page += 1;
  }

  return [...new Set(ids)];
}

async function main() {
  const ids = await listRaichuIds();
  const cards: Card[] = [];

  for (const id of ids) {
    const raw = await tcgdexFetch<unknown>(`/cards/${encodeURIComponent(id)}`);
    const card = mapTcgdexCard(raw);
    if (card) cards.push(card);
  }

  cards.sort((a, b) => (b.set.releaseDate ?? "").localeCompare(a.set.releaseDate ?? ""));

  const setMap = new Map<string, CardSet>();
  for (const card of cards) setMap.set(card.set.id, card.set);
  const sets = [...setMap.values()].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  writeFileSync(join(root, "data/sample-catalog.json"), `${JSON.stringify({ cards, sets }, null, 2)}\n`, "utf8");
  console.log(`Wrote ${cards.length} Raichu cards and ${sets.length} sets from TCGdex.`);
}

main()
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await closePool().catch(() => undefined);
    process.exit(1);
  })
  .finally(async () => {
    await closePool().catch(() => undefined);
  });
