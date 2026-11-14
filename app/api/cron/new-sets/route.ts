import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { LOCALES, localizePath } from "@/lib/i18n/config";
import { submitToIndexNow } from "@/lib/indexnow";
import { setPath } from "@/lib/set-path";
import { siteUrl } from "@/lib/site";
import { getDataMode } from "@/lib/tcg/config";
import {
  getStaticCatalog,
  getStaticCatalogAddedCardIds,
  getStaticCatalogAddedSetIds,
  getStaticCatalogBuiltAt,
} from "@/lib/tcg/static-catalog";
import { getTcgdexSets } from "@/lib/tcg/tcgdex/queries";

/** A rebuild takes minutes; one started less than this long ago is still running (or just failed). */
const REBUILD_GRACE_HOURS = 6;

/** Main pages that list sets or new cards. */
const LIST_PAGES = ["/", "/sets"];

/**
 * Daily Vercel Schedule "new-sets" (vercel.json, GET). Compares TCGdex's set list (one cheap
 * request) with the live catalog:
 * - TCGdex lists a set the live catalog lacks → triggers a rebuild through the deploy hook, so the
 *   set's page and its cards go live within a day instead of waiting for Monday's rebuild.
 *   scripts/build-catalog.ts then downloads afresh even if its cached copy is recent.
 * - The live catalog was built in the last day and brought new sets → tells search engines about
 *   their pages and cards through IndexNow.
 * Rebuilds only happen when a set is new, so the CDN cache (emptied by every deployment) stays
 * warm the rest of the time.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (getDataMode() !== "static" || !siteUrl.startsWith("https://")) {
    return NextResponse.json({ ok: true, skipped: "not the hosted static catalog" });
  }

  try {
    const catalog = getStaticCatalog();
    const ageHours = (Date.now() - Date.parse(getStaticCatalogBuiltAt())) / 3_600_000;
    const known = new Set(catalog.sets.map((set) => set.id));
    const missing = (await getTcgdexSets()).filter((set) => !known.has(set.id));

    if (missing.length > 0) {
      const sets = missing.map((set) => ({ id: set.id, name: set.name }));
      if (ageHours < REBUILD_GRACE_HOURS) return NextResponse.json({ ok: true, skipped: "rebuilt recently", sets });
      const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
      if (!hook) return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK_URL is not set", sets }, { status: 503 });
      const response = await fetch(hook, { method: "POST" });
      if (!response.ok) return NextResponse.json({ ok: false, status: response.status, sets }, { status: 502 });
      return NextResponse.json({ ok: true, triggered: "rebuild", sets });
    }

    const addedSetIds = getStaticCatalogAddedSetIds();
    if (ageHours >= 24 || addedSetIds.length === 0) return NextResponse.json({ ok: true, newSets: 0 });

    const addedSets = catalog.sets.filter((set) => addedSetIds.includes(set.id));
    const paths = [
      ...LIST_PAGES,
      ...addedSets.map(setPath),
      ...getStaticCatalogAddedCardIds().map((id) => `/cards/${encodeURIComponent(id)}`),
    ];
    const urls = LOCALES.flatMap((locale) => paths.map((path) => `${siteUrl}${localizePath(locale, path)}`));
    const result = await submitToIndexNow(siteUrl, urls);
    return NextResponse.json({ ok: result.status < 300, ...result, newSets: addedSets.map((set) => set.name) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`new-sets cron: ${message}`);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
