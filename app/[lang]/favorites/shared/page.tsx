import type { Metadata } from "next";
import { Suspense } from "react";
import { CardGrid } from "@/components/card-grid";
import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { SaveSharedButton } from "@/components/save-shared-button";
import { CardSkeletonGrid } from "@/components/skeletons";
import { parseSharedCardIds, parseSharedListName, sharedFavoritesPath } from "@/lib/card-ids";
import { formatCount } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getCardsByIds } from "@/lib/tcg/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.sharedTitle, description: t.meta.sharedDescription, robots: { index: false } };
}

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
  const [query, locale, t] = await Promise.all([searchParams, getLocale(), getDictionary()]);
  const ids = parseSharedCardIds(query.cards);
  const name = parseSharedListName(query.name);

  if (ids.length === 0) {
    return (
      <EmptyState
        title={t.shared.emptyLinkTitle}
        message={t.shared.emptyLinkMessage}
        actionHref="/"
        actionLabel={t.common.exploreCards}
      />
    );
  }

  const loaded = await getCardsByIds(ids).then(
    (result) => ({ ok: true as const, ...result }),
    () => ({ ok: false as const }),
  );
  if (!loaded.ok) return <ErrorPanel message={t.shared.loadFailed} />;

  // Keep the sharer's order.
  const byId = new Map(loaded.cards.map((card) => [card.id, card]));
  const cards = ids.flatMap((id) => byId.get(id) ?? []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{t.shared.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight sm:text-4xl">{name || t.shared.fallbackTitle}</h1>
          <p className="mt-2 text-sm text-muted">
            <span className="tabular-nums">{t.shared.cardCount(formatCount(cards.length, locale), cards.length)}</span>
            {loaded.missingIds.length > 0 ? t.shared.missing(loaded.missingIds.length) : ""}
          </p>
        </div>
        {cards.length > 0 ? <SaveSharedButton ids={cards.map((card) => card.id)} name={name || t.shared.defaultName} /> : null}
      </div>
      <div className="mt-8">
        {cards.length > 0 ? (
          <CardGrid cards={cards} returnTo={sharedFavoritesPath(ids, name || undefined)} />
        ) : (
          <EmptyState
            title={t.shared.noneAvailableTitle}
            message={t.shared.noneAvailableMessage}
            actionHref="/"
            actionLabel={t.common.exploreCards}
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
