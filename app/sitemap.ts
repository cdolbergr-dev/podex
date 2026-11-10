import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { getAllCardIds, getSitemapSets } from "@/lib/tcg/service";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/sets`, changeFrequency: "weekly", priority: 0.8 },
  ];

  // Catalog unavailable (e.g. no database at build time): still serve the static pages.
  const [sets, cardIds] = await Promise.all([
    getSitemapSets().catch(() => []),
    getAllCardIds().catch(() => []),
  ]);

  return [
    ...pages,
    ...sets.map((set) => ({
      url: `${siteUrl}/?set=${encodeURIComponent(set.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...cardIds.map((id) => ({
      url: `${siteUrl}/cards/${encodeURIComponent(id)}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
