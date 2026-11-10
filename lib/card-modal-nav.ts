import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { getBrowseNeighbors, getRememberedCard } from "@/lib/card-cache";
import { findGridTile } from "@/lib/card-transition";
import { markCardOpenedFromGrid, savePendingCardTransition } from "@/lib/card-transition-pending";
import { cardHref } from "@/lib/explore-params";

export type CardNavDirection = "prev" | "next";

let clearDirection: ReturnType<typeof setTimeout> | undefined;
let pendingNav: { cardId: string; direction: CardNavDirection } | null = null;

/** Direction the card arrived from, once — read by the incoming card to slide in. */
export function takeCardNavDirection(cardId: string): CardNavDirection | null {
  if (pendingNav?.cardId !== cardId) return null;
  const { direction } = pendingNav;
  pendingNav = null;
  return direction;
}

/**
 * Step to the neighboring card inside the open modal. Replaces history (so closing still returns
 * to the grid) and primes the same instant art/details the grid open uses.
 */
export function goToNeighborCard(
  router: AppRouterInstance,
  cardId: string,
  direction: CardNavDirection,
  returnTo?: string,
): boolean {
  if (document.body.dataset.cardTransition) return false;
  const neighbors = getBrowseNeighbors(cardId);
  const targetId = direction === "next" ? neighbors.next : neighbors.prev;
  if (!targetId) return false;

  const card = getRememberedCard(targetId);
  const gridTile = findGridTile(targetId);
  if (card) {
    savePendingCardTransition({
      id: card.id,
      src: card.images.large || card.images.small,
      name: card.name,
      setName: card.set.name,
      number: card.number,
      displayedSrc: gridTile?.querySelector("img")?.currentSrc || undefined,
    });
  }
  // Closing should morph back into the tile of the card now on screen.
  markCardOpenedFromGrid(targetId);
  document.body.dataset.openCard = targetId;

  // Keep that tile in view behind the modal (body scroll is locked, but programmatic scroll works).
  gridTile?.scrollIntoView({ block: "center", behavior: "instant" });

  pendingNav = { cardId: targetId, direction };
  clearTimeout(clearDirection);
  clearDirection = setTimeout(() => (pendingNav = null), 1500);

  router.replace(cardHref(targetId, returnTo), { scroll: false });
  return true;
}
