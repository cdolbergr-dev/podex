import type { Metadata } from "next";
import { Suspense } from "react";
import { CardDetail } from "@/components/card-detail";
import { CardDetailTransitionLayout } from "@/components/card-detail-transition-layout";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/page-container";
import { CardDetailInfoFallback } from "@/components/card-detail-info-fallback";
import { DetailFallback } from "@/components/skeletons";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { cardJsonLd } from "@/lib/structured-data";
import { getAllCardIds, getCard } from "@/lib/tcg/service";

type CardPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * One real example is prerendered at build. Cache Components needs at least one, and with it every
 * other card page is saved after its first render and then served from the CDN cache until
 * the next deployment, instead of running server code on every visit.
 */
export async function generateStaticParams() {
  const [id] = await getAllCardIds().catch(() => []);
  return [{ id: id ?? "base1-4" }];
}

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const [{ id }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  try {
    const card = await getCard(id);
    if (!card) return { title: t.meta.cardNotFoundTitle };
    const description = t.meta.cardDescription(card.name, card.set.name, card.rarity);
    return {
      title: card.name,
      description,
      alternates: languageAlternates(locale, `/cards/${encodeURIComponent(card.id)}`),
      openGraph: { title: card.name, description, type: "article" },
    };
  } catch {
    return { title: t.meta.cardTitleFallback };
  }
}

export default function CardPage(props: CardPageProps) {
  return (
    <main className="pb-20">
      <PageContainer className="py-8 sm:py-12">
        <Suspense fallback={<DetailFallback />}>
          <CardPageBody {...props} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

/** Reads no query string or cookies, so each card page is rendered once and then served from the CDN cache. */
async function CardPageBody({ params }: CardPageProps) {
  const { id } = await params;
  const [card, locale, t] = await Promise.all([getCard(id).catch(() => null), getLocale(), getDictionary()]);

  return (
    <CardDetailTransitionLayout id={id}>
      {card ? <JsonLd data={cardJsonLd(card, locale, t)} /> : null}
      <Suspense fallback={<CardDetailInfoFallback id={id} />}>
        <CardDetail id={id} />
      </Suspense>
    </CardDetailTransitionLayout>
  );
}
