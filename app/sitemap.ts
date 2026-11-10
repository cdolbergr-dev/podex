import type { MetadataRoute } from "next";
import { LOCALES, localizePath } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";
import { getAllCardIds, getSitemapSets } from "@/lib/tcg/service";

type Entry = Omit<MetadataRoute.Sitemap[number], "url" | "alternates">;

/** One entry per language, each listing the others as hreflang alternates. */
function localized(path: string, entry: Entry): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${siteUrl}${localizePath(locale, path)}`]),
  );
  return LOCALES.map((locale) => ({
    url: `${siteUrl}${localizePath(locale, path)}`,
    alternates: { languages },
    ...entry,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalog unavailable (e.g. no database at build time): still serve the static pages.
  const [sets, cardIds] = await Promise.all([
    getSitemapSets().catch(() => []),
    getAllCardIds().catch(() => []),
  ]);

  return [
    ...localized("/", { changeFrequency: "daily", priority: 1 }),
    ...localized("/sets", { changeFrequency: "weekly", priority: 0.8 }),
    ...sets.flatMap((set) =>
      localized(`/?set=${encodeURIComponent(set.id)}`, { changeFrequency: "weekly", priority: 0.6 }),
    ),
    ...cardIds.flatMap((id) =>
      localized(`/cards/${encodeURIComponent(id)}`, { changeFrequency: "monthly", priority: 0.5 }),
    ),
  ];
}
