import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { ExploreResults } from "@/components/explore-results";
import { FilterBar } from "@/components/filter-bar";
import { RetryButton } from "@/components/retry-button";
import { SearchField } from "@/components/search-field";
import { buildExploreHref, parseExploreParams } from "@/lib/explore-params";
import { formatCount } from "@/lib/format";
import { DEFAULT_PAGE_SIZE, MAX_RESTORED_PAGES } from "@/lib/tcg/constants";
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
  const listKey = buildExploreHref(params);
  const narrowed = Boolean(params.q || params.set || params.type || params.rarity);

  return (
    <div className="min-w-0">
      <SearchField params={params} />

      <FilterBar params={params} sets={meta.sets} rarities={meta.rarities} />

      {result.correctedQuery ? (
        <p className="mt-8 text-sm text-muted">
          No matches for “{params.q}”. Showing results for{" "}
          <span className="font-medium text-foreground">{result.correctedQuery}</span>.
        </p>
      ) : null}
      <p className={`${result.correctedQuery ? "mt-1" : "mt-8"} mb-5 text-sm text-muted`}>
        <span className="tabular-nums">{formatCount(result.totalCount)}</span>{" "}
        {result.totalCount === 1 ? "card" : "cards"}
        {narrowed ? (result.totalCount === 1 ? " matches" : " match") : ""}
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
          title="No cards match"
          message="Try another name, set, type, or rarity."
          actionHref="/"
          actionLabel="Browse all cards"
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
