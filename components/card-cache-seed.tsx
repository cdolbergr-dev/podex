"use client";

import { useEffect } from "react";
import { rememberCards, setBrowseOrder } from "@/lib/card-cache";
import type { Card } from "@/types/catalog";

/** Hands the grid's cards (and their order) to the client cache for instant details and prev/next. */
export function CardCacheSeed({ cards }: { cards: Card[] }) {
  useEffect(() => {
    rememberCards(cards);
    setBrowseOrder(cards.map((card) => card.id));
  }, [cards]);

  return null;
}
