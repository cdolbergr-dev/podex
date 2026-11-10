"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import {
  flushAnalyticsQueue,
  trackPageview,
  UMAMI_DOMAINS,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
} from "@/lib/analytics";

/** Query parameters that describe what someone is looking at. `page` (Load more depth) and
 *  `return` (where a card closes back to) are left out so they don't create extra views. */
const MEANINGFUL_PARAMS = ["q", "set", "type", "rarity", "sort", "list", "name"];

/**
 * Loads Umami and reports one page view per distinct page. Automatic tracking is off because
 * "Load more" and live search rewrite the URL constantly; we report path changes and changes to
 * the meaningful filters only.
 */
export function UmamiAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const kept = new URLSearchParams();
  for (const key of MEANINGFUL_PARAMS) {
    const value = searchParams.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  // Shared lists carry card ids in the URL; report the page, not the ids.
  const url = pathname === "/favorites/shared" ? pathname : `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    trackPageview(url);
  }, [url]);

  if (!UMAMI_WEBSITE_ID) return null;

  return (
    <Script
      src={UMAMI_SCRIPT_URL}
      data-website-id={UMAMI_WEBSITE_ID}
      data-domains={UMAMI_DOMAINS}
      data-auto-track="false"
      strategy="afterInteractive"
      onLoad={flushAnalyticsQueue}
    />
  );
}
