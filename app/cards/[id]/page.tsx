import type { Metadata } from "next";
import { Suspense } from "react";
import { CardDetail } from "@/components/card-detail";
import { CardDetailTransitionLayout } from "@/components/card-detail-transition-layout";
import { PageContainer } from "@/components/page-container";
import { CardDetailInfoFallback } from "@/components/card-detail-info-fallback";
import { DetailFallback } from "@/components/skeletons";
import { getCard } from "@/lib/tcg/service";

type CardPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const card = await getCard(id);
    if (!card) return { title: "Card not found" };
    const description = `${card.name} from ${card.set.name}${card.rarity ? ` · ${card.rarity}` : ""}.`;
    return {
      title: card.name,
      description,
      alternates: { canonical: `/cards/${encodeURIComponent(card.id)}` },
      openGraph: { title: card.name, description, type: "article" },
    };
  } catch {
    return { title: "Card" };
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

  return (
    <CardDetailTransitionLayout id={id} returnTo={returnTo}>
      <Suspense fallback={<CardDetailInfoFallback id={id} />}>
        <CardDetail id={id} returnTo={returnTo} />
      </Suspense>
    </CardDetailTransitionLayout>
  );
}
