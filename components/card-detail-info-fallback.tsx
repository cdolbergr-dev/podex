"use client";

import { useSyncExternalStore } from "react";
import { CardDetailInfo } from "@/components/card-detail-info";
import { CardPricesSkeleton } from "@/components/card-prices-panel";
import { DetailInfoFallback } from "@/components/skeletons";
import { getRememberedCard } from "@/lib/card-cache";

const noSubscribe = () => () => {};

/** Details from the grid's copy of the card while the route fetches; skeleton if we have none. */
export function CardDetailInfoFallback({ id }: { id: string }) {
  // Server snapshot is null so hydration matches; client navigations read the cache directly.
  const card = useSyncExternalStore(noSubscribe, () => getRememberedCard(id), () => null);

  return card ? <CardDetailInfo card={card} prices={<CardPricesSkeleton />} /> : <DetailInfoFallback />;
}
