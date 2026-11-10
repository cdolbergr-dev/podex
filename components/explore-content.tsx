import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { ExploreResults } from "@/components/explore-results";
import { FilterBar } from "@/components/filter-bar";
import { RetryButton } from "@/components/retry-button";
import { SearchField } from "@/components/search-field";
import { SetProgress } from "@/components/set-progress";
import { longerSetIds, setCardTotal } from "@/lib/owned";
import { buildExploreHref, parseExploreParams } from "@/lib/explore-params";
import { formatCount, formatReleaseDate } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT, MAX_RESTORED_PAGES } from "@/lib/tcg/constants";
import { localizePath } from "@/lib/i18n/config";
import { setPath } from "@/lib/set-path";
import { permanentRedirect } from "next/navigation";
import { catalogErrorMessage } from "@/lib/tcg/errors";
import { getFilterMeta, searchCards } from "@/lib/tcg/service";

export async function ExploreContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // `?page=N` records how many "Load more" batches were showing; render them all at once so
  // back/forward, reloads and shared links return to the same place in the list.
  const parsed = parseExploreParams(await searchParams);
  const params = { ...parsed, page: 1, pageSize: DEFAULT_PAGE_SIZE };
  const restoredPages = Math.min(parsed.page, MAX_RESTORED_PAGES);
  const loaded = await loadExplore({ ...params, pageSize: DEFAULT_PAGE_SIZE * restoredPages });

  if (!loaded.ok) {
    return <ErrorPanel message={loaded.message} action={<RetryButton />} />;
  }

  const { result, meta } = loaded;
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const count = formatCount(result.totalCount, locale);
  const listKey = buildExploreHref(params);
  const narrowed = Boolean(params.q || params.set || params.type || params.rarity);
  const activeSet = params.set ? meta.sets.find((set) => set.id === params.set) : undefined;
  // A bare set filter (old /?set=… links) now has its own page.
  if (activeSet && !params.q && !params.type && !params.rarity && params.sort === DEFAULT_SORT) {
    permanentRedirect(localizePath(locale, setPath(activeSet)));
  }

  return (
    <div className="min-w-0">
      <SearchField params={params} />

      <FilterBar params={params} sets={meta.sets} rarities={meta.rarities} />

      {activeSet ? (
        <p className="mt-6 max-w-2xl text-sm leading-6 text-muted">
          {t.sets.summary(
            activeSet.name,
            formatReleaseDate(activeSet.releaseDate, locale),
            formatCount(setCardTotal(activeSet) || result.totalCount, locale),
          )}
        </p>
      ) : null}
      {activeSet ? (
        <SetProgress setId={activeSet.id} total={setCardTotal(activeSet)} longer={longerSetIds(activeSet, meta.sets)} />
      ) : null}

      {result.correctedQuery ? (
        <p className="mt-8 text-sm text-muted">
          {t.explore.noMatchesFor(params.q)}{" "}
          <span className="font-medium text-foreground">{result.correctedQuery}</span>.
        </p>
      ) : null}
      <p className={`${result.correctedQuery ? "mt-1" : "mt-8"} mb-5 text-sm text-muted`}>
        <span className="tabular-nums">
          {narrowed ? t.explore.cardMatchCount(count, result.totalCount) : t.explore.cardCount(count, result.totalCount)}
        </span>
      </p>

      {result.cards.length > 0 ? (
        <ExploreResults
          key={listKey}
          params={params}
          searchParams={result.correctedQuery ? { ...params, q: result.correctedQuery } : params}
          initialCards={result.cards}
          totalCount={result.totalCount}
        />
      ) : (
        <EmptyState
          title={t.explore.noCardsMatchTitle}
          message={t.explore.noCardsMatchMessage}
          actionHref="/"
          actionLabel={t.explore.browseAll}
        />
      )}

    </div>
  );
}

async function loadExplore(params: ReturnType<typeof parseExploreParams>) {
  try {
    const [result, meta] = await Promise.all([searchCards(params), getFilterMeta()]);
    return { ok: true as const, result, meta };
  } catch (error) {
    return { ok: false as const, message: catalogErrorMessage(error) };
  }
}
