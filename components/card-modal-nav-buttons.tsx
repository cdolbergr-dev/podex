"use client";

import { useI18n, useLocaleRouter } from "@/components/i18n-provider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getBrowseNeighbors } from "@/lib/card-cache";
import { goToNeighborCard, type CardNavDirection } from "@/lib/card-modal-nav";

const noSubscribe = () => () => {};

/** Previous/next arrows in the card modal header (keys and swipe live in CardModalOverlay). */
export function CardModalNavButtons({ cardId, returnTo }: { cardId: string; returnTo: string }) {
  const router = useLocaleRouter();
  // String snapshot keeps useSyncExternalStore stable; empty on the server.
  const neighbors = useSyncExternalStore(
    noSubscribe,
    () => {
      const { prev, next } = getBrowseNeighbors(cardId);
      return `${prev ?? ""}|${next ?? ""}`;
    },
    () => "|",
  );
  const [prev, next] = neighbors.split("|");
  if (!prev && !next) return null;

  return (
    <div className="flex items-center gap-1">
      <NavButton direction="prev" disabled={!prev} onClick={() => goToNeighborCard(router, cardId, "prev", returnTo)} />
      <NavButton direction="next" disabled={!next} onClick={() => goToNeighborCard(router, cardId, "next", returnTo)} />
    </div>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: CardNavDirection;
  disabled: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? t.card.previous : t.card.next}
      aria-keyshortcuts={direction === "prev" ? "ArrowLeft" : "ArrowRight"}
      className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-background disabled:cursor-default disabled:opacity-40"
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}
