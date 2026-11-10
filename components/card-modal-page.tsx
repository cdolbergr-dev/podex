import { Suspense } from "react";
import { CardDetail } from "@/components/card-detail";
import { CardDetailTransitionLayout } from "@/components/card-detail-transition-layout";
import { CardModalOverlay } from "@/components/card-modal-overlay";
import { CardDetailInfoFallback } from "@/components/card-detail-info-fallback";

type CardModalPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function CardModalPage({ params, searchParams }: CardModalPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = Array.isArray(query.return) ? query.return[0] : query.return;

  return (
    <CardModalOverlay returnTo={returnTo} cardId={id}>
      <CardDetailTransitionLayout id={id} returnTo={returnTo} presentation="modal">
        <Suspense fallback={<CardDetailInfoFallback id={id} />}>
          <CardDetail id={id} returnTo={returnTo} />
        </Suspense>
      </CardDetailTransitionLayout>
    </CardModalOverlay>
  );
}
