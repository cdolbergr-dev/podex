import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/**
 * AI search and assistant crawlers, named so allowing them is an explicit choice. They fetch
 * pages to answer a person's question or to cite the site, which can bring visitors.
 */
const AI_SEARCH_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "Bingbot",
];

/**
 * Crawlers that collect pages to train AI models. They walk all ~72,000 card pages over and over,
 * which cost more server time than the free hosting plan allows (November 2026), and send no
 * visitors back. Bots that ignore robots.txt are blocked by Vercel's Firewall instead.
 */
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "cohere-training-data-crawler",
  "Diffbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: AI_SEARCH_CRAWLERS, allow: "/", disallow: ["/api/"] },
      { userAgent: AI_TRAINING_CRAWLERS, disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
