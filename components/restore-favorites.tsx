"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { countBackupCards, decodeFavoriteLists, type FavoriteBackup } from "@/lib/favorites-backup";

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

type State =
  | { status: "reading" }
  | { status: "invalid" }
  | { status: "ready"; backup: FavoriteBackup }
  | { status: "restored"; backup: FavoriteBackup; added: number };

/** Restores lists from a "Back up all lists" link. The data is in the URL hash, client-only. */
export function RestoreFavorites() {
  const { ready, mergeLists, addOwned } = useFavorites();
  const { t, formatNumber, listName } = useI18n();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => null);
  const [state, setState] = useState<State>({ status: "reading" });

  useEffect(() => {
    if (hash === null) return;
    let cancelled = false;
    void (hash ? decodeFavoriteLists(hash) : Promise.resolve(null)).then((backup) => {
      if (!cancelled) setState(backup ? { status: "ready", backup } : { status: "invalid" });
    });
    return () => {
      cancelled = true;
    };
  }, [hash]);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.restore.title}</h1>

      {state.status === "reading" ? <p className="mt-3 text-sm text-muted">{t.restore.reading}</p> : null}

      {state.status === "invalid" ? (
        <div className="mt-3 space-y-5">
          <p className="text-sm leading-6 text-muted">{t.restore.invalid}</p>
          <LocaleLink href="/favorites" className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface">
            {t.restore.goToFavorites}
          </LocaleLink>
        </div>
      ) : null}

      {state.status === "ready" || state.status === "restored" ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-muted">
            {t.restore.summary(
              formatNumber(state.backup.lists.length),
              state.backup.lists.length,
              formatNumber(countBackupCards(state.backup)),
              countBackupCards(state.backup),
            )}
          </p>
          <ul className="mt-5 divide-y divide-border rounded-2xl border border-border bg-surface">
            {state.backup.lists.map((list, index) => (
              <li key={`${list.name}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0 truncate">{listName(list.name)}</span>
                <span className="tabular-nums text-faint">
                  {t.restore.cards(formatNumber(list.cardIds.length), list.cardIds.length)}
                </span>
              </li>
            ))}
            {state.backup.owned.length > 0 ? (
              <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="min-w-0 truncate">{t.owned.owned}</span>
                <span className="tabular-nums text-faint">
                  {t.owned.backupOwned(formatNumber(state.backup.owned.length), state.backup.owned.length)}
                </span>
              </li>
            ) : null}
          </ul>
          <div className="mt-6">
            {state.status === "restored" ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm" role="status">
                  {state.added > 0
                    ? t.restore.restored(formatNumber(state.added), state.added)
                    : t.restore.alreadySaved}
                </p>
                <LocaleLink
                  href="/favorites"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm text-surface"
                >
                  {t.restore.viewFavorites}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </LocaleLink>
              </div>
            ) : (
              <button
                type="button"
                disabled={!ready}
                onClick={() =>
                  setState({
                    status: "restored",
                    backup: state.backup,
                    added: mergeLists(state.backup.lists) + addOwned(state.backup.owned),
                  })
                }
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-5 text-sm text-surface hover:opacity-90 disabled:cursor-default disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                {t.restore.restoreButton(state.backup.lists.length)}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
