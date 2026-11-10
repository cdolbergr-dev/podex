"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { countBackupCards, decodeFavoriteLists, type BackupList } from "@/lib/favorites-backup";
import { formatCount } from "@/lib/format";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

type State =
  | { status: "reading" }
  | { status: "invalid" }
  | { status: "ready"; lists: BackupList[] }
  | { status: "restored"; lists: BackupList[]; added: number };

/** Restores lists from a "Back up all lists" link. The data is in the URL hash, client-only. */
export function RestoreFavorites() {
  const { ready, mergeLists } = useFavorites();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => null);
  const [state, setState] = useState<State>({ status: "reading" });

  useEffect(() => {
    if (hash === null) return;
    let cancelled = false;
    void (hash ? decodeFavoriteLists(hash) : Promise.resolve(null)).then((lists) => {
      if (!cancelled) setState(lists ? { status: "ready", lists } : { status: "invalid" });
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Restore favorites</h1>

      {state.status === "reading" ? <p className="mt-3 text-sm text-muted">Reading your backup…</p> : null}

      {state.status === "invalid" ? (
        <div className="mt-3 space-y-5">
          <p className="text-sm leading-6 text-muted">
            This backup link is incomplete or damaged. Make sure you copied the whole link, including everything
            after the “#”.
          </p>
          <Link href="/favorites" className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface">
            Go to favorites
          </Link>
        </div>
      ) : null}

      {state.status === "ready" || state.status === "restored" ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-muted">
            This backup has {formatCount(state.lists.length)} {state.lists.length === 1 ? "list" : "lists"} with{" "}
            {formatCount(countBackupCards(state.lists))} {countBackupCards(state.lists) === 1 ? "card" : "cards"}.
            Restoring adds them to the favorites in this browser — nothing you already have is removed.
          </p>
          <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface">
            {state.lists.map((list, index) => (
              <li key={`${list.name}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0 truncate">{list.name}</span>
                <span className="tabular-nums text-faint">
                  {formatCount(list.cardIds.length)} {list.cardIds.length === 1 ? "card" : "cards"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {state.status === "restored" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm" role="status">
                  {state.added > 0
                    ? `Restored — ${formatCount(state.added)} ${state.added === 1 ? "card" : "cards"} added.`
                    : "Everything in this backup was already saved here."}
                </p>
                <Link
                  href="/favorites"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-surface"
                >
                  View favorites
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() => setState({ status: "restored", lists: state.lists, added: mergeLists(state.lists) })}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-sm text-surface hover:opacity-90 disabled:cursor-default disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Restore {state.lists.length === 1 ? "list" : "lists"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
