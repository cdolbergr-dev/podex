"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CardGrid } from "@/components/card-grid";
import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { useFavorites } from "@/components/favorites-provider";
import { FavoritesSafeguards } from "@/components/favorites-safeguards";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { CardSkeletonGrid } from "@/components/skeletons";
import { loadFavoriteCards } from "@/lib/actions";
import { MAX_SHARED_CARDS } from "@/lib/card-ids";
import { collectionCsv, downloadFile } from "@/lib/collection-csv";
import { setIdOfCard } from "@/lib/owned";
import type { Card } from "@/types/catalog";

export type CollectionSet = { id: string; name: string; path: string; total: number };

/** Owned cards, newest set first and by number within a set, plus progress per started set. */
export function CollectionView({ sets, siteUrl }: { sets: CollectionSet[]; siteUrl: string }) {
  const { locale, t, formatNumber } = useI18n();
  const { owned, ready } = useFavorites();
  const [shown, setShown] = useState(false);
  const [cards, setCards] = useState<Map<string, Card>>(new Map());
  const [limit, setLimit] = useState(MAX_SHARED_CARDS);
  /** The request that last failed; a different set of missing cards is a fresh attempt. */
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    // Owned cards live in localStorage, which the server cannot see.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  const groups = useMemo(() => {
    const longestFirst = sets.map((set) => set.id).sort((a, b) => b.length - a.length);
    const bySet = new Map<string, string[]>();
    for (const id of owned) {
      const setId = setIdOfCard(id, longestFirst);
      if (setId) bySet.set(setId, [...(bySet.get(setId) ?? []), id]);
    }
    const number = (id: string, setId: string) => id.slice(setId.length + 1);
    return sets.flatMap((set) => {
      const ids = bySet.get(set.id);
      if (!ids) return [];
      ids.sort((a, b) => number(a, set.id).localeCompare(number(b, set.id), undefined, { numeric: true }));
      return [{ set, ids }];
    });
  }, [owned, sets]);

  // Cards are fetched in pages of MAX_SHARED_CARDS, in display order.
  const ordered = useMemo(() => groups.flatMap((group) => group.ids), [groups]);
  const wanted = ordered.slice(0, limit);
  const missing = wanted.filter((id) => !cards.has(id));
  const missingKey = missing.join("\n");

  useEffect(() => {
    if (!shown || !ready || missing.length === 0) return;
    let cancelled = false;
    loadFavoriteCards(missing)
      .then((result) => {
        if (cancelled) return;
        setCards((current) => {
          const next = new Map(current);
          for (const card of result.cards) next.set(card.id, card);
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(missingKey);
      });
    return () => {
      cancelled = true;
    };
    // `missing` is derived from missingKey; depending on the key avoids refetching every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey, ready, shown]);

  const [exportState, setExportState] = useState<"idle" | "working" | "failed">("idle");

  /** Every owned card, fetched in pages (not just the ones shown), as one spreadsheet. */
  async function exportCsv() {
    setExportState("working");
    try {
      const all = new Map(cards);
      const todo = ordered.filter((id) => !all.has(id));
      for (let index = 0; index < todo.length; index += MAX_SHARED_CARDS) {
        const result = await loadFavoriteCards(todo.slice(index, index + MAX_SHARED_CARDS));
        for (const card of result.cards) all.set(card.id, card);
      }
      const rows = ordered.flatMap((id) => all.get(id) ?? []);
      const date = new Date().toISOString().slice(0, 10);
      downloadFile(collectionCsv(rows, locale, t, siteUrl), `podex-${t.collection.exportFilename}-${date}.csv`);
      setExportState("idle");
    } catch {
      setExportState("failed");
    }
  }

  const settled = shown && ready;
  const failed = failedKey !== null && failedKey === missingKey;
  const loading = settled && missing.length > 0 && !failed;
  const visible = new Set(wanted);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.collection.title}</h1>
        {settled && owned.length > 0 ? (
          <button
            type="button"
            onClick={exportCsv}
            disabled={exportState === "working"}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-hover disabled:cursor-default disabled:opacity-60"
          >
            <Download aria-hidden="true" className="size-4" />
            <span aria-live="polite">{exportState === "working" ? t.collection.exporting : t.collection.export}</span>
          </button>
        ) : null}
      </div>
      {exportState === "failed" ? (
        <p role="alert" className="mt-2 text-sm text-heart">
          {t.collection.exportFailed}
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted">
        {settled && owned.length > 0
          ? t.owned.collectionSummary(formatNumber(owned.length), owned.length, groups.length)
          : t.favorites.savedInBrowser}
      </p>

      {settled ? <FavoritesSafeguards /> : null}

      {!settled ? (
        <div className="mt-8">
          <CardSkeletonGrid count={8} />
        </div>
      ) : owned.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={t.collection.emptyTitle}
            message={t.collection.emptyMessage}
            actionHref="/sets"
            actionLabel={t.collection.browseSets}
          />
        </div>
      ) : (
        <>
          <section aria-labelledby="collection-sets" className="mt-8">
            <h2 id="collection-sets" className="text-sm font-medium">
              {t.collection.setsHeading}
            </h2>
            <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map(({ set, ids }) => (
                <li key={set.id} className="border-b border-border py-3">
                  <LocaleLink href={set.path} className="flex items-baseline justify-between gap-4 text-sm hover:underline">
                    <span className="min-w-0 truncate">{set.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-owned">
                      {formatNumber(ids.length)} / {formatNumber(set.total || ids.length)}
                    </span>
                  </LocaleLink>
                  <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-skeleton-soft">
                    <span
                      className="block h-full rounded-full bg-owned"
                      style={{ width: `${Math.min(100, (ids.length / Math.max(1, set.total || ids.length)) * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {failed && cards.size === 0 ? (
            <div className="mt-10">
              <ErrorPanel message={t.collection.loadFailed} />
            </div>
          ) : null}

          <div className="mt-12 space-y-12">
            {groups.map(({ set, ids }) => {
              const shownCards = ids.filter((id) => visible.has(id)).flatMap((id) => cards.get(id) ?? []);
              if (shownCards.length === 0) return null;
              return (
                <section key={set.id} aria-labelledby={`collection-${set.id}`}>
                  <h2 id={`collection-${set.id}`} className="mb-5 text-sm font-medium">
                    <LocaleLink href={set.path} className="hover:underline">
                      {set.name}
                    </LocaleLink>
                  </h2>
                  <CardGrid cards={shownCards} returnTo="/collection" showOwned />
                </section>
              );
            })}
          </div>

          {loading && cards.size === 0 ? <CardSkeletonGrid count={8} /> : null}

          {ordered.length > limit ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((value) => value + MAX_SHARED_CARDS)}
                disabled={loading}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-border bg-surface px-5 text-sm hover:bg-surface-hover disabled:cursor-default disabled:opacity-60"
              >
                {loading ? t.explore.loading : t.collection.showMore}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
