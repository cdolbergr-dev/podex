"use client";

import { RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { countBackupCards, decodeFavoriteLists, encodeFavoriteLists } from "@/lib/favorites-backup";
import {
  FAVORITES_CHANGE_EVENT,
  hasStoredFavorites,
  listsFromBackup,
  readFavoriteLists,
  writeFavoriteLists,
} from "@/lib/favorites-storage";
import { formatCount } from "@/lib/format";
import { requestPersistentStorage } from "@/lib/storage-persistence";

const ENDPOINT = "/api/favorites/backup";
const MIRRORED_THIS_SESSION = "podex.favoritesMirrored";

function mirroredThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(MIRRORED_THIS_SESSION) !== null;
  } catch {
    return false;
  }
}

async function mirrorToServer() {
  if (!hasStoredFavorites()) return;
  const lists = readFavoriteLists();
  const data = await encodeFavoriteLists(lists);
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
    keepalive: true,
  });
  // Marked only once a copy is really stored, so a cancelled attempt is retried.
  if (response.ok) {
    try {
      window.sessionStorage.setItem(MIRRORED_THIS_SESSION, "1");
    } catch {
      // ignore
    }
  }
  if (lists.some((list) => list.cardIds.length > 0)) void requestPersistentStorage();
}

let restoreAttempt: Promise<number> | null = null;

/** One restore per page load, shared by every mount (effects can run twice). */
function restoreFromServerOnce(): Promise<number> {
  restoreAttempt ??= restoreFromServer();
  return restoreAttempt;
}

/** Pulls the server-set cookie copy back in when this browser's lists have been wiped. */
async function restoreFromServer(): Promise<number> {
  const response = await fetch(ENDPOINT, { cache: "no-store" });
  if (response.status !== 200) return 0;
  const { data } = (await response.json()) as { data?: string };
  const lists = data ? await decodeFavoriteLists(data) : null;
  if (!lists || countBackupCards(lists) === 0 || hasStoredFavorites()) return 0;
  writeFavoriteLists(listsFromBackup(lists));
  return countBackupCards(lists);
}

/**
 * Keeps a server-set cookie copy of the favorite lists in step with localStorage and restores
 * from it if the browser cleared localStorage on its own (e.g. Safari's 7-day limit).
 */
export function FavoritesSafetyNet() {
  const [restoredCount, setRestoredCount] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const mirrorSoon = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void mirrorToServer().catch(() => undefined), 1200);
    };

    if (!hasStoredFavorites() || restoreAttempt) {
      restoreFromServerOnce()
        .then((count) => {
          if (!cancelled && count > 0) setRestoredCount(count);
        })
        .catch(() => undefined);
    } else if (!mirroredThisSession()) {
      // Once per visit: make sure a copy exists and renew the cookie's lifetime.
      mirrorSoon();
    }

    window.addEventListener(FAVORITES_CHANGE_EVENT, mirrorSoon);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener(FAVORITES_CHANGE_EVENT, mirrorSoon);
    };
  }, []);

  useEffect(() => {
    if (restoredCount === 0) return;
    const timeout = window.setTimeout(() => setRestoredCount(0), 10_000);
    return () => window.clearTimeout(timeout);
  }, [restoredCount]);

  if (restoredCount === 0) return null;

  return (
    <div
      role="status"
      className="install-prompt-in fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_48px_-24px_rgba(28,25,23,0.5)]"
    >
      <RotateCcw aria-hidden="true" className="size-5 shrink-0 text-heart" />
      <p className="min-w-0 flex-1 text-sm leading-5">
        Your browser had cleared your saved cards, so we restored them ({formatCount(restoredCount)}{" "}
        {restoredCount === 1 ? "card" : "cards"}).{" "}
        <Link href="/favorites" className="underline underline-offset-4" onClick={() => setRestoredCount(0)}>
          View favorites
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setRestoredCount(0)}
        aria-label="Dismiss"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
