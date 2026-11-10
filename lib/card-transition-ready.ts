import { cardViewTransitionName } from "@/lib/card-transition";

function modalArtworkSelector(cardId: string): string {
  const vt = cardViewTransitionName(cardId);
  return `[data-podex-card-modal-preflight] [style*="${vt}"], [data-podex-card-modal]:not([data-podex-card-modal-preflight]) [style*="${vt}"]`;
}

function hasModalArtwork(cardId: string): boolean {
  return Boolean(document.querySelector(modalArtworkSelector(cardId)));
}

export function waitForCardModalShell(cardId: string, timeoutMs = 800): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (hasModalArtwork(cardId)) return Promise.resolve();

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observer: MutationObserver | undefined;

    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      observer?.disconnect();
    };

    const finish = () => {
      cleanup();
      resolve();
    };

    timer = setTimeout(finish, timeoutMs);
    observer = new MutationObserver(() => {
      if (hasModalArtwork(cardId)) finish();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  });
}
