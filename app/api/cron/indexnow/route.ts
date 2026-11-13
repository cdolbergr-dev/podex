import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { LOCALES, localizePath } from "@/lib/i18n/config";
import { submitToIndexNow } from "@/lib/indexnow";
import { siteUrl } from "@/lib/site";
import { getDataMode } from "@/lib/tcg/config";
import { getStaticCatalogAddedCardIds, getStaticCatalogBuiltAt } from "@/lib/tcg/static-catalog";

/** Main pages that change whenever the catalog does. */
const LIST_PAGES = ["/", "/sets", "/pokemon", "/artists"];

/**
 * Weekly Vercel Schedule "indexnow" (vercel.json, Mondays, GET), an hour after "rebuild-catalog" so the new
 * deployment is live: submits the list pages and any cards new in today's catalog, in every
 * language. Skips catalogs older than a day (the rebuild didn't run or reused a cached copy).
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (getDataMode() !== "static" || !siteUrl.startsWith("https://")) {
    return NextResponse.json({ ok: true, skipped: "not the hosted static catalog" });
  }

  const ageHours = (Date.now() - Date.parse(getStaticCatalogBuiltAt())) / 3_600_000;
  if (!(ageHours < 24)) return NextResponse.json({ ok: true, skipped: "catalog not rebuilt today" });

  const added = getStaticCatalogAddedCardIds();
  const paths = [...LIST_PAGES, ...added.map((id) => `/cards/${encodeURIComponent(id)}`)];
  const urls = LOCALES.flatMap((locale) => paths.map((path) => `${siteUrl}${localizePath(locale, path)}`));

  try {
    const result = await submitToIndexNow(siteUrl, urls);
    // 200/202: accepted. Anything else is reported but not retried; tomorrow's run sends the list pages again.
    return NextResponse.json({ ok: result.status < 300, ...result, newCards: added.length });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
