import { flushSync } from "react-dom";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  canUseViewTransitions,
  cardViewTransitionName,
  findGridTile,
  prefersReducedMotion,
} from "@/lib/card-transition";
import {
  clearCardOpenedFromGrid,
  clearPendingCardTransition,
  shouldAnimateCardTransition,
} from "@/lib/card-transition-pending";

function clearCardTransitionFlags() {
  delete document.body.dataset.cardTransition;
  delete document.body.dataset.cardClosing;
}

function isOnCardRoute(): boolean {
  return /^\/cards\/[^/]+/.test(window.location.pathname);
}

/**
 * A card opened from a grid in this tab sits one history entry above that grid (prev/next
 * replace, not push), so popping returns to it exactly — loaded cards, filters and scroll.
 * Pushing `back` instead would add an entry and rebuild the list.
 */
function shouldDismissWithHistoryBack(openedFromGrid: boolean): boolean {
  if (!openedFromGrid || typeof window === "undefined") return false;
  return window.history.length > 1;
}

/** Ensure only the grid tile owns the shared name in the post-close DOM snapshot. */
function prepareCloseMorph(cardId: string) {
  const sharedName = cardViewTransitionName(cardId);
  document.body.dataset.cardClosing = cardId;
  delete document.body.dataset.openCard;

  for (const modal of document.querySelectorAll(
    "[data-podex-card-modal], [data-podex-card-modal-preflight]",
  )) {
    const nodes = [modal as HTMLElement, ...modal.querySelectorAll<HTMLElement>("*")];
    for (const node of nodes) {
      const name = getComputedStyle(node).viewTransitionName;
      if (name && name !== "none") {
        node.style.viewTransitionName = "none";
      }
    }
  }

  const gridTile = findGridTile(cardId);
  if (gridTile) {
    gridTile.style.viewTransitionName = sharedName;
  }
}

function clearCloseMorph(cardId: string) {
  const gridTile = findGridTile(cardId);
  if (gridTile) gridTile.style.viewTransitionName = "";
}

function isCardModalVisible(): boolean {
  for (const modal of document.querySelectorAll(
    "[data-podex-card-modal], [data-podex-card-modal-preflight]",
  )) {
    // Next keeps the previous route mounted but hidden (`display: none`) — ignore those.
    if (modal.getClientRects().length > 0) return true;
  }
  return false;
}

/**
 * Router navigations commit asynchronously, so the view-transition update callback must
 * wait for the modal to leave the DOM; otherwise the "new" snapshot still shows the modal.
 * Rendering is paused during the callback, so this watches mutations rather than frames.
 */
function waitForCardModalDismissed(timeoutMs = 1000): Promise<void> {
  if (!isOnCardRoute() && !isCardModalVisible()) return Promise.resolve();

  return new Promise((resolve) => {
    const check = () => {
      if (!isOnCardRoute() && !isCardModalVisible()) finish();
    };
    const finish = () => {
      clearTimeout(timer);
      clearInterval(poll);
      observer.disconnect();
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const poll = setInterval(check, 50);
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  });
}

function dismissCardRoute(
  router: AppRouterInstance,
  back: string,
  openedFromGrid: boolean,
) {
  if (shouldDismissWithHistoryBack(openedFromGrid)) {
    router.back();
    return;
  }
  router.push(back, { scroll: false });
}

function ensureCardDismissed(
  router: AppRouterInstance,
  back: string,
  openedFromGrid: boolean,
) {
  if (typeof window === "undefined") return;
  if (!isOnCardRoute()) return;
  dismissCardRoute(router, back, openedFromGrid);
}

let closeInFlight = false;

/** True from a close request until its modal has left the screen. */
export function isCardCloseInFlight(): boolean {
  return closeInFlight;
}

function isCardOpening(): boolean {
  return "cardOpening" in document.body.dataset || !isOnCardRoute();
}

/**
 * Closed while the card is still opening (navigation pending or open morph running).
 * Starting a back/push navigation on top of the in-flight open leaves the router with a
 * stale modal on screen, so hide everything now and close once the open has settled.
 */
function closeAfterOpenSettles(
  router: AppRouterInstance,
  back: string,
  cardId: string,
  onNavigate?: () => void,
) {
  document.body.dataset.cardDismissPending = "";
  // Don't let the card finish flying in after the user asked to close it.
  (document as Document & { activeViewTransition?: ViewTransition | null }).activeViewTransition?.skipTransition();

  const started = Date.now();
  const poll = setInterval(() => {
    const settled = !("cardOpening" in document.body.dataset) && isOnCardRoute();
    if (!settled && Date.now() - started < 10_000) return;
    clearInterval(poll);

    const openedFromGrid = shouldAnimateCardTransition(cardId);
    clearCardOpenedFromGrid();
    clearPendingCardTransition();
    delete document.body.dataset.openCard;
    flushSync(() => onNavigate?.());
    if (isOnCardRoute()) dismissCardRoute(router, back, openedFromGrid);

    void waitForCardModalDismissed().then(() => {
      delete document.body.dataset.cardDismissPending;
      closeInFlight = false;
    });
  }, 50);
}

export function runCardCloseNavigation(
  router: AppRouterInstance,
  back: string,
  cardId: string,
  onNavigate?: () => void,
) {
  // One close at a time: a second Escape mid-close would navigate back twice.
  if (closeInFlight) return;
  closeInFlight = true;

  if (isCardOpening()) {
    closeAfterOpenSettles(router, back, cardId, onNavigate);
    return;
  }

  const openedFromGrid = shouldAnimateCardTransition(cardId);
  const useMorph =
    !prefersReducedMotion() && canUseViewTransitions() && openedFromGrid;

  const navigate = () => {
    if (useMorph) prepareCloseMorph(cardId);
    clearCardOpenedFromGrid();
    clearPendingCardTransition();
    dismissCardRoute(router, back, openedFromGrid);
    // Preflight shell (closed before the route modal took over) isn't route-driven.
    if (useMorph) flushSync(() => onNavigate?.());
  };

  const finish = () => {
    clearCardTransitionFlags();
    onNavigate?.();
    ensureCardDismissed(router, back, openedFromGrid);
    void waitForCardModalDismissed().then(() => {
      closeInFlight = false;
    });
  };

  if (!useMorph) {
    navigate();
    finish();
    return;
  }

  document.body.dataset.cardTransition = "active";

  try {
    const transition = document.startViewTransition(() => {
      navigate();
      return waitForCardModalDismissed();
    });
    const done = () => {
      clearCloseMorph(cardId);
      finish();
    };
    void transition.finished.then(done).catch(done);
  } catch {
    navigate();
    finish();
  }
}
