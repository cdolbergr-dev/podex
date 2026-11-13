"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";
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
 * Unlinked switch for the site owner: opening any page with "?umami=off" stops Umami from counting
 * this browser (Umami's own `umami.disabled` flag, checked before every send); "?umami=on" counts
 * it again. The parameter is removed from the address afterwards.
 */
function applyOptOutSwitch() {
  const url = new URL(window.location.href);
  const value = url.searchParams.get("umami");
  if (value !== "off" && value !== "on") return;
  try {
    if (value === "off") localStorage.setItem("umami.disabled", "1");
    else localStorage.removeItem("umami.disabled");
  } catch {
    return; // storage blocked (e.g. some private modes): nothing to switch
  }
  url.searchParams.delete("umami");
  window.history.replaceState(window.history.state, "", url);
  window.alert(value === "off" ? "Umami: visits from this browser are no longer counted." : "Umami: visits from this browser are counted again.");
}

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
  const url = stripLocale(pathname) === "/favorites/shared" ? pathname : `${pathname}${query ? `?${query}` : ""}`;

  useEffect(() => {
    applyOptOutSwitch();
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
