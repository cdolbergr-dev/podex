"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CardGrid } from "@/components/card-grid";
import { EmptyState, ErrorPanel } from "@/components/empty-state";
import { useFavorites } from "@/components/favorites-provider";
import { FavoritesSafeguards } from "@/components/favorites-safeguards";
import { ShareFavoritesButton } from "@/components/share-favorites-button";
import { CardSkeletonGrid } from "@/components/skeletons";
import { loadFavoriteCards } from "@/lib/actions";
import { MAX_LIST_NAME_LENGTH } from "@/lib/favorites-storage";
import { formatCount } from "@/lib/format";
import type { Card } from "@/types/catalog";

function listHref(listId: string): string {
  return `/favorites?list=${encodeURIComponent(listId)}`;
}

export function FavoritesView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lists, ready, count, createList, renameList, deleteList } = useFavorites();
  const [request, setRequest] = useState<{
    key: string;
    cards: Card[];
    missingCount: number;
    status: "ready" | "error";
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState(false);
  const settled = shown && ready;

  // The selected list lives in the URL so it survives reloads and back/forward.
  const requestedId = searchParams.get("list");
  const list = lists.find((item) => item.id === requestedId) ?? lists[0];
  const ids = list?.cardIds ?? [];
  const idsKey = ids.join("\n");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  useEffect(() => {
    if (!settled || ids.length === 0) return;

    let cancelled = false;
    loadFavoriteCards(ids)
      .then((result) => {
        if (cancelled) return;
        setRequest({
          key: idsKey,
          cards: result.cards,
          missingCount: result.missingIds.length,
          status: "ready",
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRequest({ key: idsKey, cards: [], missingCount: 0, status: "error" });
      });

    return () => {
      cancelled = true;
    };
    // `ids` is derived from idsKey; depending on the key avoids refetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, idsKey, settled]);

  const current = request?.key === idsKey ? request : null;
  // Keep showing the previous result while a changed list loads, minus cards no longer in it.
  const byId = new Map((current?.cards ?? request?.cards ?? []).map((card) => [card.id, card]));
  const visible = ids.flatMap((id) => byId.get(id) ?? []);
  const showSkeleton = !settled || (ids.length > 0 && !current && visible.length === 0);

  function selectList(listId: string) {
    setRenaming(false);
    router.push(listHref(listId), { scroll: false });
  }

  return (
    <div>
      <div>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Favorites</h1>
        <p className="mt-2 text-sm text-muted">
          {settled ? (
            <>
              <span className="tabular-nums">{formatCount(count)}</span> {count === 1 ? "card" : "cards"}
              {lists.length > 1 ? (
                <>
                  {" "}
                  in <span className="tabular-nums">{lists.length}</span> lists
                </>
              ) : null}{" "}
              saved in this browser
            </>
          ) : (
            "Saved in this browser"
          )}
        </p>
      </div>

      {settled ? <FavoritesSafeguards /> : null}

      {settled && list ? (
        <>
          <nav aria-label="Favorite lists" className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex w-max items-center gap-2 sm:w-auto sm:flex-wrap">
              {lists.map((item) => {
                const selected = item.id === list.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectList(item.id)}
                      aria-current={selected ? "page" : undefined}
                      className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                        selected
                          ? "border-foreground bg-foreground text-surface"
                          : "border-border bg-surface text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <span className="max-w-48 truncate">{item.name}</span>
                      <span className={`tabular-nums text-xs ${selected ? "text-surface/70" : "text-faint"}`}>
                        {item.cardIds.length}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                {creating ? (
                  <NameForm
                    label="New list name"
                    submitLabel="Create"
                    onSubmit={(name) => {
                      const id = createList(name);
                      setCreating(false);
                      selectList(id);
                    }}
                    onCancel={() => setCreating(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border px-4 text-sm text-muted hover:border-foreground/30 hover:text-foreground"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    New list
                  </button>
                )}
              </li>
            </ul>
          </nav>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            {renaming ? (
              <NameForm
                label="List name"
                submitLabel="Save"
                initialValue={list.name}
                onSubmit={(name) => {
                  renameList(list.id, name);
                  setRenaming(false);
                }}
                onCancel={() => setRenaming(false)}
              />
            ) : (
              <h2 className="min-w-0 truncate text-xl font-medium tracking-tight">{list.name}</h2>
            )}
            <div className="flex items-center gap-1">
              {ids.length > 0 ? <ShareFavoritesButton ids={ids} name={list.name} /> : null}
              {!renaming ? (
                <IconAction label={`Rename ${list.name}`} onClick={() => setRenaming(true)}>
                  <Pencil aria-hidden="true" className="size-4" />
                </IconAction>
              ) : null}
              {lists.length > 1 || ids.length > 0 ? (
                <IconAction
                  label={lists.length > 1 ? `Delete ${list.name}` : `Clear ${list.name}`}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </IconAction>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-6">
        {showSkeleton ? <CardSkeletonGrid count={8} /> : null}

        {current?.status === "error" && visible.length === 0 ? (
          <ErrorPanel
            message="Saved cards could not be loaded."
            action={
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface"
              >
                Try again
              </button>
            }
          />
        ) : null}

        {settled && ids.length === 0 ? (
          <EmptyState
            title={count === 0 ? "No favorites yet" : "Nothing in this list yet"}
            message={
              count === 0
                ? "Save a card while you browse. It will still be here when you come back."
                : "Open a card and use Save to add it to this list."
            }
            actionHref="/"
            actionLabel="Explore cards"
          />
        ) : null}

        {visible.length > 0 && list ? (
          <>
            {current && current.missingCount > 0 ? (
              <p className="mb-5 text-sm text-muted">
                {current.missingCount} saved {current.missingCount === 1 ? "card isn’t" : "cards aren’t"} in the
                current catalog.
              </p>
            ) : null}
            <CardGrid cards={visible} returnTo={listHref(list.id)} />
          </>
        ) : null}
      </div>

      {/* Title depends on the saved lists, which only exist client-side. */}
      {settled && list ? (
        <ConfirmDialog
          open={confirmingDelete}
          title={lists.length > 1 ? `Delete “${list.name}”?` : `Clear “${list.name}”?`}
          message={
            lists.length > 1
              ? "The list is removed from this browser. Its cards stay in any other lists they’re in."
              : "This removes every card from the list. You can save them again later."
          }
          confirmLabel={lists.length > 1 ? "Delete list" : "Clear list"}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            const remaining = lists.filter((item) => item.id !== list.id);
            deleteList(list.id);
            setConfirmingDelete(false);
            if (lists.length > 1 && remaining[0]) router.replace(listHref(remaining[0].id), { scroll: false });
          }}
        />
      ) : null}
    </div>
  );
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** Inline name field for creating/renaming a list. Enter saves, Escape cancels. */
function NameForm({
  label,
  submitLabel,
  initialValue = "",
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onSubmit(value);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1.5">
      <input
        aria-label={label}
        autoFocus
        value={value}
        maxLength={MAX_LIST_NAME_LENGTH}
        onChange={(event) => setValue(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
        }}
        placeholder="List name"
        className="h-10 w-48 rounded-full border border-border bg-surface px-4 text-sm placeholder:text-faint"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="inline-flex h-10 cursor-pointer items-center rounded-full bg-foreground px-4 text-sm text-surface disabled:cursor-default disabled:opacity-40"
      >
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-10 cursor-pointer items-center rounded-full px-3 text-sm text-muted hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="podex-dialog"
      aria-labelledby="favorites-confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="px-6 py-6">
        <h2 id="favorites-confirm-title" className="text-lg font-medium tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center rounded-full px-4 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
