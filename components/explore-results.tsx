"use client";

import { useEffect, useState } from "react";
import { CardGrid } from "@/components/card-grid";
import { loadMoreExploreCards } from "@/lib/actions";
import { buildExploreHref } from "@/lib/explore-params";
import { useI18n } from "@/components/i18n-provider";
import { stripLocale } from "@/lib/i18n/config";
import { findGridTile } from "@/lib/card-transition";
import { DEFAULT_PAGE_SIZE, MAX_RESTORED_PAGES } from "@/lib/tcg/constants";
import type { Card, ExploreParams } from "@/types/catalog";

/**
 * How many batches this list should show, read from the URL: `?page=N` on explore itself, or the
 * `return` link of the card open on top of it. Next can restore this grid from an older cached
 * render (e.g. Back from another page onto an open card), which only holds the first batch.
 */
function restoreDepth(listKey: string): number {
  const current = new URL(window.location.href);
  let list = current;
  if (/^\/cards\//.test(stripLocale(current.pathname))) {
    const back = current.searchParams.get("return");
    if (!back) return 1;
    list = new URL(back, current.origin);
  }

  const page = Number.parseInt(list.searchParams.get("page") ?? "1", 10);
  list.searchParams.delete("page");
  const query = list.searchParams.toString();
  if (`${stripLocale(list.pathname)}${query ? `?${query}` : ""}` !== listKey) return 1;
  return Number.isFinite(page) ? Math.min(Math.max(page, 1), MAX_RESTORED_PAGES) : 1;
}

const SCROLL_KEY = "podex.exploreScroll";
let scrollRestored = false;

/**
 * The browser restores scroll before the streamed grid exists, so a reload deep in the list
 * lands near the top. Remember the position on unload and re-apply it once, after the list
 * (with its restored batches) has rendered.
 */
function useReloadScrollRestore() {
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ url: location.pathname + location.search, y: scrollY }));
      } catch {
        // Storage unavailable — the browser's own restoration still applies.
      }
    };
    window.addEventListener("pagehide", save);

    if (!scrollRestored) {
      scrollRestored = true;
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation?.type === "reload" || navigation?.type === "back_forward") {
        try {
          const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? "null") as { url: string; y: number } | null;
          if (saved && saved.url === location.pathname + location.search && saved.y > scrollY) {
            requestAnimationFrame(() => window.scrollTo({ top: saved.y, behavior: "instant" }));
          }
        } catch {
          // ignore
        }
      }
    }

    return () => window.removeEventListener("pagehide", save);
  }, []);
}

/**
 * Explore grid that grows with "Load more" instead of paging. Keyed by query by its parent.
 * `params` is the query as it appears in the URL; `searchParams` what to fetch (it differs when
 * a misspelled query was corrected).
 */
export function ExploreResults({
  params,
  searchParams,
  initialCards,
  totalCount,
}: {
  params: ExploreParams;
  searchParams: ExploreParams;
  initialCards: Card[];
  totalCount: number;
}) {
  const { t, href: localize, formatNumber } = useI18n();
  const [cards, setCards] = useState(initialCards);
  const loadedPages = Math.max(1, Math.ceil(cards.length / DEFAULT_PAGE_SIZE));
  // Cards opened from here return to this depth (and the URL keeps it for back/reload).
  const returnTo = buildExploreHref(params, { page: loadedPages });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const hasMore = !exhausted && cards.length < totalCount;
  const listKey = buildExploreHref(params, { page: 1 });
  useReloadScrollRestore();

  function appendCards(more: Card[]) {
    setCards((current) => {
      const seen = new Set(current.map((card) => card.id));
      return [...current, ...more.filter((card) => !seen.has(card.id))];
    });
  }

  // Fetch any batches the URL says were showing but this render doesn't have.
  useEffect(() => {
    const target = restoreDepth(listKey);
    const have = Math.ceil(initialCards.length / DEFAULT_PAGE_SIZE);
    if (target <= have || initialCards.length >= totalCount) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        for (let page = have + 1; page <= target && !cancelled; page++) {
          const more = await loadMoreExploreCards(searchParams, page);
          if (cancelled || more.length === 0) break;
          appendCards(more);
        }
      } catch {
        // The Load more button stays available to retry.
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (cancelled) return;
      // A card is open on top: put its tile back in view so closing morphs into the right spot.
      const openId = document.body.dataset.openCard;
      if (openId) {
        requestAnimationFrame(() => findGridTile(openId)?.scrollIntoView({ block: "center", behavior: "instant" }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // Restore once per mounted list; later batches come from the Load more button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  async function loadMore() {
    setLoading(true);
    setFailed(false);
    try {
      const nextPage = Math.floor(cards.length / DEFAULT_PAGE_SIZE) + 1;
      const more = await loadMoreExploreCards(searchParams, nextPage);
      if (more.length === 0) setExhausted(true);
      if (more.length > 0) {
        // Replace, not push: the current entry should remember the depth, but Back should
        // still leave the page rather than step through each batch.
        window.history.replaceState(null, "", localize(buildExploreHref(params, { page: nextPage })));
      }
      appendCards(more);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <CardGrid cards={cards} returnTo={returnTo} />
      {hasMore || failed ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-sm">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex h-11 min-w-36 cursor-pointer items-center justify-center rounded-full border border-border bg-surface px-5 hover:bg-surface-hover disabled:cursor-default disabled:text-muted"
          >
            {loading ? t.explore.loading : failed ? t.common.tryAgain : t.explore.loadMore}
          </button>
          <p className="tabular-nums text-faint" aria-live="polite">
            {failed
              ? t.explore.couldNotLoadMore
              : t.explore.showingOf(formatNumber(cards.length), formatNumber(totalCount))}
          </p>
        </div>
      ) : null}
    </>
  );
}
