"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/page-container";
import { useCardOpen } from "@/components/card-open-context";
import { CardModalHandoff } from "@/components/card-modal-handoff";
import { goToNeighborCard } from "@/lib/card-modal-nav";
import { runCardCloseNavigation } from "@/lib/card-transition-nav";
import { safeReturnPath } from "@/lib/explore-params";

// Preflight and route overlays overlap during handoff; count locks so the first to
// unmount doesn't restore scrolling under the one still open.
let scrollLocks = 0;
let unlockedOverflow = "";

function lockBodyScroll() {
  if (scrollLocks++ === 0) {
    unlockedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = unlockedOverflow;
  };
}

export function CardModalOverlay({
  returnTo,
  cardId,
  preflight = false,
  children,
}: {
  returnTo?: string;
  cardId: string;
  /** Click-time shell; any other overlay is the route modal and clears it once mounted. */
  preflight?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const { endCardOpen, preflightCardId } = useCardOpen();
  const back = safeReturnPath(returnTo);
  // Fade the backdrop in only when nothing is on screen yet: not when the route modal takes over
  // from the preflight shell, nor when stepping to the previous/next card (old overlay still locked).
  const [fadeIn] = useState(() => preflight || (preflightCardId === null && scrollLocks === 0));
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => lockBodyScroll(), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        runCardCloseNavigation(router, back, cardId, endCardOpen);
        return;
      }
      if (preflight || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (goToNeighborCard(router, cardId, event.key === "ArrowRight" ? "next" : "prev", back)) {
          event.preventDefault();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [back, cardId, endCardOpen, preflight, router]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      {...(preflight ? { "data-podex-card-modal-preflight": "" } : { "data-podex-card-modal": "" })}
    >
      <div
        className={`absolute inset-0 z-0 bg-background/90 backdrop-blur-md ${fadeIn ? "card-modal-scrim-in" : ""}`}
        aria-hidden="true"
      />
      <div
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain py-8 [scrollbar-gutter:stable] sm:py-12"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          swipeStart.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = swipeStart.current;
          const touch = event.changedTouches[0];
          swipeStart.current = null;
          if (preflight || !start || !touch) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          // A deliberate horizontal swipe, not a scroll.
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
          goToNeighborCard(router, cardId, dx < 0 ? "next" : "prev", back);
        }}
      >
        {preflight ? null : <CardModalHandoff />}
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
