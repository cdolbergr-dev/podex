import { closePool } from "../lib/db/client";
import { loadProjectEnv } from "../lib/load-env";
import { syncCatalogFromApi } from "../lib/tcg/sync";

loadProjectEnv();

/**
 * The site caches catalog reads; tell the running server to refresh them. Targets
 * CATALOG_REVALIDATE_URL, else NEXT_PUBLIC_SITE_URL, else the local dev server.
 */
async function revalidateSite() {
  const secret = process.env.CRON_SECRET?.trim();
  const origin = (
    process.env.CATALOG_REVALIDATE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  if (!secret) {
    console.warn("CRON_SECRET is not set: the site keeps serving its cached catalog until the cache expires.");
    return;
  }
  try {
    const response = await fetch(`${origin}/api/catalog/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    console.log(
      response.ok
        ? `Asked ${origin} to refresh its cached catalog.`
        : `Could not refresh the cache at ${origin} (HTTP ${response.status}).`,
    );
  } catch {
    console.warn(`Could not reach ${origin} to refresh its cached catalog. Is the site running?`);
  }
}

async function main() {
  if (process.argv.includes("--revalidate-only")) {
    await revalidateSite();
    return;
  }
  const result = await syncCatalogFromApi();
  console.log(`Synced ${result.cardCount} cards across ${result.setCount} sets.`);
  await closePool();
  await revalidateSite();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closePool().catch(() => undefined);
  process.exit(1);
});
