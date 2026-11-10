/** Safe `view-transition-name` for a catalog card id. */
export function cardViewTransitionName(id: string): string {
  return `podex-card-${id.replace(/[^a-zA-Z0-9-]/g, "_")}`;
}

/** The on-screen grid tile for a card (hidden, kept-alive routes may hold copies). */
export function findGridTile(cardId: string): HTMLElement | null {
  for (const node of document.querySelectorAll<HTMLElement>(
    `[data-podex-card-id="${CSS.escape(cardId)}"]`,
  )) {
    if (node.getClientRects().length > 0) return node;
  }
  return null;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function canUseViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}
