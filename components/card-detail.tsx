import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CardDetailArtworkBridge } from "@/components/card-detail-artwork-context";
import { CardTransitionLink } from "@/components/card-transition-link";
import { CardDetailInfo } from "@/components/card-detail-info";
import { CardPricesPanel, CardPricesSkeleton } from "@/components/card-prices-panel";
import { getDkkRates } from "@/lib/exchange-rates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { catalogErrorMessage } from "@/lib/tcg/errors";
import { getCard, getCardPrices } from "@/lib/tcg/service";
import type { Card } from "@/types/catalog";

export async function CardDetail({
  id,
  returnTo,
}: {
  id: string;
  returnTo?: string;
}) {
  let card: Card | null = null;
  let failure: string | null = null;

  try {
    card = await getCard(id);
  } catch (error) {
    failure = catalogErrorMessage(error);
  }

  if (failure) {
    const t = await getDictionary();
    return (
      <div role="alert" className="rounded-2xl border border-border bg-surface px-6 py-12">
        <h1 className="text-2xl font-medium tracking-tight">{t.errors.couldntLoadCard}</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">{failure}</p>
        <CardTransitionLink href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface">
          {t.card.backToExplore}
        </CardTransitionLink>
      </div>
    );
  }

  if (!card) notFound();

  return (
    <>
      <CardDetailArtworkBridge
        card={{
          id: card.id,
          src: card.images.large || card.images.small,
          name: card.name,
          setName: card.set.name,
          number: card.number,
        }}
      />
      <CardDetailInfo
        card={card}
        prices={
          <Suspense fallback={<CardPricesSkeleton />}>
            <CardPrices id={card.id} />
          </Suspense>
        }
      />
    </>
  );
}

async function CardPrices({ id }: { id: string }) {
  const locale = await getLocale();
  // Danish visitors see kroner; everyone else the market's own currency.
  const [prices, dkk] = await Promise.all([
    getCardPrices(id),
    locale === "da" ? getDkkRates().catch(() => null) : null,
  ]);
  return <CardPricesPanel prices={prices} dkk={dkk} />;
}
