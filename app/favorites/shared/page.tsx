import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGrid } from "@/components/card-grid";
import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { SaveSharedButton } from "@/components/save-shared-button";
import { CardSkeletonGrid } from "@/components/skeletons";
import { parseSharedCardIds, parseSharedListName, sharedFavoritesPath } from "@/lib/card-ids";
import { formatCount } from "@/lib/format";
import { getCardsByIds } from "@/lib/tcg/service";

export const metadata: Metadata = {
  title: "Shared favorites",
  description: "A list of Pokémon cards someone shared from Podex.",
  robots: { index: false },
};

type SharedPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function SharedFavoritesPage(props: SharedPageProps) {
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <Suspense fallback={<SharedFallback />}>
          <SharedFavorites {...props} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function SharedFavorites({ searchParams }: SharedPageProps) {
  const query = await searchParams;
  const ids = parseSharedCardIds(query.cards);
  const name = parseSharedListName(query.name);

  if (ids.length === 0) {
    return (
      <EmptyState
        title="This link has no cards"
        message="The shared list is empty or the link was cut off."
        actionHref="/"
        actionLabel="Explore cards"
      />
    );
  }

  const loaded = await getCardsByIds(ids).then(
    (result) => ({ ok: true as const, ...result }),
    () => ({ ok: false as const }),
  );
  if (!loaded.ok) return <ErrorPanel message="The shared cards could not be loaded." />;

  // Keep the sharer's order.
  const byId = new Map(loaded.cards.map((card) => [card.id, card]));
  const cards = ids.flatMap((id) => byId.get(id) ?? []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Shared list</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{name || "Shared favorites"}</h1>
          <p className="mt-2 text-sm text-muted">
            <span className="tabular-nums">{formatCount(cards.length)}</span> {cards.length === 1 ? "card" : "cards"}
            {loaded.missingIds.length > 0 ? ` · ${loaded.missingIds.length} no longer in the catalog` : ""}
          </p>
        </div>
        {cards.length > 0 ? <SaveSharedButton ids={cards.map((card) => card.id)} name={name || "Shared list"} /> : null}
      </div>
      <div className="mt-8">
        {cards.length > 0 ? (
          <CardGrid cards={cards} returnTo={sharedFavoritesPath(ids, name || undefined)} />
        ) : (
          <EmptyState
            title="None of these cards are available"
            message="They may have been removed from the catalog."
            actionHref="/"
            actionLabel="Explore cards"
          />
        )}
      </div>
    </div>
  );
}

function SharedFallback() {
  return (
    <div>
      <div className="h-10 w-64 animate-pulse rounded-full bg-skeleton" />
      <div className="mt-3 h-4 w-24 animate-pulse rounded-full bg-skeleton-soft" />
      <div className="mt-8">
        <CardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
