import catalog from "@/data/sample-catalog.json";
import { MemoryCatalog } from "@/lib/tcg/memory-catalog";

/** Small bundled catalog (Raichu cards) for local development without a database or download. */
export const sampleCatalog = new MemoryCatalog(catalog.cards, catalog.sets);
