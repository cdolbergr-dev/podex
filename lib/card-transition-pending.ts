export type PendingCardTransition = {
  id: string;
  src: string;
  name: string;
  setName: string;
  number: string;
  /** URL the grid tile is already showing (in memory) — paints instantly as a base layer. */
  displayedSrc?: string;
};

const STORAGE_KEY = "podex.cardTransition";
const FROM_GRID_KEY = "podex.cardFromGrid";

export function markCardOpenedFromGrid(cardId: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(FROM_GRID_KEY, cardId);
  } catch {
    // ignore
  }
}

export function clearCardOpenedFromGrid() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(FROM_GRID_KEY);
  } catch {
    // ignore
  }
}

export function shouldAnimateCardTransition(cardId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(FROM_GRID_KEY) === cardId;
  } catch {
    return false;
  }
}
export function savePendingCardTransition(payload: PendingCardTransition) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode or storage full — transition still works without preview image.
  }
}

let snapshotRaw: string | null = null;
let snapshotValue: PendingCardTransition | null = null;

/** Referentially stable read for useSyncExternalStore (re-parses only when storage changes). */
export function readPendingCardTransitionSnapshot(id: string): PendingCardTransition | null {
  if (typeof sessionStorage === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    try {
      snapshotValue = raw ? (JSON.parse(raw) as PendingCardTransition) : null;
    } catch {
      snapshotValue = null;
    }
  }
  return snapshotValue?.id === id ? snapshotValue : null;
}

export function readPendingCardTransition(id: string): PendingCardTransition | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingCardTransition;
    return parsed.id === id ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingCardTransition() {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function cardIdFromCardHref(href: string): string | null {
  const path = href.split("?")[0]?.split("#")[0] ?? "";
  const match = path.match(/^\/cards\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}
