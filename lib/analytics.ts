/**
 * Umami Cloud analytics (cookieless). Page views are reported by UmamiAnalytics on route changes;
 * custom events go through trackEvent. Calls made before the script loads are queued.
 */

/** Umami Cloud website ID for podexcards.com. Empty disables analytics entirely. */
export const UMAMI_WEBSITE_ID = "bada4a12-4127-41c9-bde6-67d6bae32743";
export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
/** Umami only records hits from these hosts, so local development never counts. */
export const UMAMI_DOMAINS = "podexcards.com";

type EventData = Record<string, string | number | boolean>;

type UmamiTracker = {
  track: {
    (): void;
    (name: string, data?: EventData): void;
    (props: (base: Record<string, unknown>) => Record<string, unknown>): void;
  };
};

declare global {
  interface Window {
    umami?: UmamiTracker;
  }
}

const queue: ((umami: UmamiTracker) => void)[] = [];

function withUmami(call: (umami: UmamiTracker) => void) {
  if (!UMAMI_WEBSITE_ID || typeof window === "undefined") return;
  if (window.umami) call(window.umami);
  else if (queue.length < 50) queue.push(call);
}

/** Runs calls made before the script finished loading. */
export function flushAnalyticsQueue() {
  const umami = typeof window !== "undefined" ? window.umami : undefined;
  if (!umami) return;
  for (const call of queue.splice(0)) call(umami);
}

/** A page view for `url` (path plus the query parameters worth reporting). */
export function trackPageview(url: string) {
  withUmami((umami) => umami.track((base) => ({ ...base, url })));
}

/** A named event, e.g. "app-installed". Shown under Events in the Umami dashboard. */
export function trackEvent(name: string, data?: EventData) {
  withUmami((umami) => umami.track(name, data));
}
