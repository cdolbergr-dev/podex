/** Public origin for absolute URLs (sitemap, robots, social previews). */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
