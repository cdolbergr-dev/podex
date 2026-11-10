"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import type { ComponentProps } from "react";
import { useCardOpen } from "@/components/card-open-context";
import {
  canUseViewTransitions,
  cardViewTransitionName,
  findGridTile,
  prefersReducedMotion,
} from "@/lib/card-transition";
import { isCardCloseInFlight, runCardCloseNavigation } from "@/lib/card-transition-nav";
import {
  cardIdFromCardHref,
  markCardOpenedFromGrid,
  savePendingCardTransition,
  type PendingCardTransition,
} from "@/lib/card-transition-pending";
import { safeReturnPath } from "@/lib/explore-params";

function waitForImageDecode(img: HTMLImageElement | null, timeoutMs = 150): Promise<void> {
  if (!img) return Promise.resolve();
  return Promise.race([
    img.decode().catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

type CardTransitionLinkProps = ComponentProps<typeof Link> & {
  transitionCard?: PendingCardTransition;
};

export function CardTransitionLink({
  href,
  onClick,
  transitionCard,
  ...props
}: CardTransitionLinkProps) {
  const router = useRouter();
  const { beginCardOpen, finishCardMorph, endCardOpen } = useCardOpen();

  return (
    <Link
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (typeof href !== "string") return;

        const targetCardId = cardIdFromCardHref(href);
        if (!targetCardId) return;

        // A close is still animating; opening now would race its navigation.
        if (isCardCloseInFlight()) {
          event.preventDefault();
          return;
        }

        const gridTile = findGridTile(targetCardId);
        if (transitionCard) {
          const displayedSrc = gridTile?.querySelector("img")?.currentSrc || undefined;
          savePendingCardTransition({ ...transitionCard, displayedSrc });
        }
        markCardOpenedFromGrid(targetCardId);
        document.body.dataset.openCard = targetCardId;

        if (prefersReducedMotion() || !canUseViewTransitions()) {
          router.push(href, { scroll: false });
          return;
        }

        event.preventDefault();
        document.body.dataset.cardTransition = "active";
        // Closes requested before this clears wait for the open to settle (card-transition-nav).
        document.body.dataset.cardOpening = "";

        // Escape can arrive before any modal (and its key handler) has mounted.
        const back = safeReturnPath(new URL(href, window.location.origin).searchParams.get("return") ?? undefined);
        const onEarlyEscape = (keyEvent: KeyboardEvent) => {
          if (keyEvent.key === "Escape") runCardCloseNavigation(router, back, targetCardId, endCardOpen);
        };
        window.addEventListener("keydown", onEarlyEscape);

        // Only the clicked tile is named, so it alone morphs (and nothing else in the grid
        // is lifted above the modal while the transition runs).
        if (gridTile) gridTile.style.viewTransitionName = cardViewTransitionName(targetCardId);

        const navigate = () => {
          if (gridTile) gridTile.style.viewTransitionName = "";
          flushSync(() => beginCardOpen(targetCardId));
          router.push(href, { scroll: false });
          // Snapshot the modal only once its art has decoded, or the morph lands on a blank frame.
          return waitForImageDecode(
            document.querySelector<HTMLImageElement>("[data-podex-card-modal-preflight] img"),
          );
        };

        const finish = () => {
          window.removeEventListener("keydown", onEarlyEscape);
          delete document.body.dataset.cardTransition;
          delete document.body.dataset.cardOpening;
          // Keep the preflight shell until the route modal mounts (CardModalHandoff).
          flushSync(() => finishCardMorph());
        };

        try {
          const transition = document.startViewTransition(navigate);
          void transition.finished.then(finish).catch(finish);
        } catch {
          navigate();
          finish();
        }
      }}
    />
  );
}
