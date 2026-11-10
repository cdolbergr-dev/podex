"use client";

import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { readPendingCardTransitionSnapshot, type PendingCardTransition } from "@/lib/card-transition-pending";

type ArtworkPreview = PendingCardTransition | null;

const CardDetailArtworkContext = createContext<{
  preview: ArtworkPreview;
  setPreview: (value: ArtworkPreview) => void;
} | null>(null);

const noSubscribe = () => () => {};

export function CardDetailArtworkProvider({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  // sessionStorage is client-only: the server snapshot is null so hydration matches, while a
  // client-side open reads the grid's preview in its first render (before the morph snapshot).
  const pending = useSyncExternalStore(
    noSubscribe,
    () => readPendingCardTransitionSnapshot(id),
    () => null,
  );
  const [loaded, setPreview] = useState<ArtworkPreview>(null);
  // The fetched card has no grid URL; keep the pending one as the instant base layer.
  const preview = loaded ? { ...loaded, displayedSrc: loaded.displayedSrc ?? pending?.displayedSrc } : pending;

  return (
    <CardDetailArtworkContext.Provider value={{ preview, setPreview }}>
      {children}
    </CardDetailArtworkContext.Provider>
  );
}

export function useCardDetailArtwork() {
  const value = useContext(CardDetailArtworkContext);
  if (!value) throw new Error("CardDetailArtworkProvider is missing");
  return value;
}

export function CardDetailArtworkBridge({ card }: { card: PendingCardTransition }) {
  const { setPreview } = useCardDetailArtwork();

  useLayoutEffect(() => {
    setPreview(card);
  }, [card.id, card.src, card.name, card.setName, card.number, setPreview]);

  return null;
}
