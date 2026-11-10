import type { MetadataRoute } from "next";
import { LOCALES, localizePath, type Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/site";
import { getSitemapCollections } from "@/lib/tcg/collections";
import { getAllCardIds, getSitemapSets } from "@/lib/tcg/service";

type Entry = Omit<MetadataRoute.Sitemap[number], "url" | "alternates">;

/**
 * One sitemap per language (Google allows 50,000 addresses per file; each language has
 * ~26,000). /sitemap.xml is the index listing them (app/sitemap.xml/route.ts).
 */
export async function generateSitemaps() {
  return LOCALES.map((_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const locale: Locale = LOCALES[Number(await props.id)] ?? LOCALES[0];

  /** This language's address, listing every language version as hreflang alternates. */
  function localized(path: string, entry: Entry): MetadataRoute.Sitemap {
    const languages = Object.fromEntries(LOCALES.map((each) => [each, `${siteUrl}${localizePath(each, path)}`]));
    return [{ url: `${siteUrl}${localizePath(locale, path)}`, alternates: { languages }, ...entry }];
  }

  // Catalog unavailable (e.g. no database at build time): still serve the static pages.
  const [sets, cardIds, collections] = await Promise.all([
    getSitemapSets().catch(() => []),
    getAllCardIds().catch(() => []),
    getSitemapCollections().catch(() => ({ pokemon: [], artists: [] })),
  ]);

  return [
    ...localized("/", { changeFrequency: "daily", priority: 1 }),
    ...localized("/sets", { changeFrequency: "weekly", priority: 0.8 }),
    ...localized("/pokemon", { changeFrequency: "weekly", priority: 0.8 }),
    ...localized("/artists", { changeFrequency: "weekly", priority: 0.6 }),
    ...collections.pokemon.flatMap((slug) =>
      localized(`/pokemon/${slug}`, { changeFrequency: "weekly", priority: 0.7 }),
    ),
    ...collections.artists.flatMap((slug) =>
      localized(`/artists/${slug}`, { changeFrequency: "monthly", priority: 0.5 }),
    ),
    ...sets.flatMap((set) =>
      localized(`/?set=${encodeURIComponent(set.id)}`, { changeFrequency: "weekly", priority: 0.6 }),
    ),
    ...cardIds.flatMap((id) =>
      localized(`/cards/${encodeURIComponent(id)}`, { changeFrequency: "monthly", priority: 0.5 }),
    ),
  ];
}
