"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CardModalInstantShell } from "@/components/card-modal-instant-shell";

type CardOpenContextValue = {
  preflightCardId: string | null;
  /** True while the open morph animates into the preflight shell. */
  morphing: boolean;
  beginCardOpen: (cardId: string) => void;
  /** Morph done — preflight stays up until the route modal mounts and hands off. */
  finishCardMorph: () => void;
  endCardOpen: () => void;
};

const CardOpenContext = createContext<CardOpenContextValue | null>(null);

export function useCardOpen() {
  const value = useContext(CardOpenContext);
  if (!value) {
    throw new Error("useCardOpen must be used within CardOpenProvider");
  }
  return value;
}

function CardOpenPreflightModal({ cardId }: { cardId: string }) {
  return <CardModalInstantShell cardId={cardId} preflight />;
}

export function CardOpenProvider({ children }: { children: ReactNode }) {
  const [preflightCardId, setPreflightCardId] = useState<string | null>(null);
  const [morphing, setMorphing] = useState(false);

  const beginCardOpen = useCallback((cardId: string) => {
    setPreflightCardId(cardId);
    setMorphing(true);
  }, []);

  const finishCardMorph = useCallback(() => {
    setMorphing(false);
  }, []);

  const endCardOpen = useCallback(() => {
    setPreflightCardId(null);
    setMorphing(false);
  }, []);

  const value = useMemo(
    () => ({ preflightCardId, morphing, beginCardOpen, finishCardMorph, endCardOpen }),
    [beginCardOpen, endCardOpen, finishCardMorph, morphing, preflightCardId],
  );

  return (
    <CardOpenContext.Provider value={value}>
      {children}
      {preflightCardId ? <CardOpenPreflightModal cardId={preflightCardId} /> : null}
    </CardOpenContext.Provider>
  );
}
