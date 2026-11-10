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
import { getCard } from "@/lib/tcg/service";

type CardPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

async function CardPageBody({ params, searchParams }: CardPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = Array.isArray(query.return) ? query.return[0] : query.return;
  const [card, locale, t] = await Promise.all([getCard(id).catch(() => null), getLocale(), getDictionary()]);

  return (
    <CardDetailTransitionLayout id={id} returnTo={returnTo}>
      {card ? <JsonLd data={cardJsonLd(card, locale, t)} /> : null}
      <Suspense fallback={<CardDetailInfoFallback id={id} />}>
        <CardDetail id={id} returnTo={returnTo} />
      </Suspense>
    </CardDetailTransitionLayout>
  );
}
