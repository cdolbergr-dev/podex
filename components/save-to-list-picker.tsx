"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useFavorites } from "@/components/favorites-provider";
import { MAX_LIST_NAME_LENGTH } from "@/lib/favorites-storage";

const WIDTH = 256;
const GAP = 8;
const EDGE = 12;

/**
 * "Save to list" popover anchored to a heart/Save button. Rendered in a portal above the card
 * modal; positioned with fixed coordinates so it never clips inside a grid tile.
 */
export function SaveToListPicker({
  cardId,
  cardName,
  anchor,
  onClose,
}: {
  cardId: string;
  cardName: string;
  anchor: HTMLElement;
  onClose: () => void;
}) {
  const { lists, listsContaining, toggleInList, createList } = useFavorites();
  const panelRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const containing = listsContaining(cardId);

  // Below the button, right-aligned to it; flipped above when there's no room; kept on screen.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = anchor.getBoundingClientRect();
    const height = panel.offsetHeight;
    const left = Math.min(Math.max(EDGE, rect.right - WIDTH), window.innerWidth - WIDTH - EDGE);
    const below = rect.bottom + GAP;
    const top = below + height > window.innerHeight - EDGE ? Math.max(EDGE, rect.top - GAP - height) : below;
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.visibility = "visible";
  }, [anchor, creating, lists.length]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !anchor.contains(target)) onClose();
    }
    // Capture phase on window runs before the card modal's Escape handler; stop it there so
    // Escape closes only the picker.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    function onScroll(event: Event) {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
      if (previous?.isConnected) previous.focus();
    };
  }, [anchor, onClose]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    createList(name, [cardId]);
    setName("");
    setCreating(false);
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Save ${cardName} to a list`}
      // Placed (and revealed) by the layout effect once its height is known.
      style={{ top: 0, left: 0, width: WIDTH, visibility: "hidden" }}
      className="fixed z-[130] rounded-2xl border border-border bg-surface p-1.5 shadow-[0_24px_48px_-20px_rgba(28,25,23,0.5)]"
    >
      <p className="px-3 pt-2 pb-1.5 text-xs text-faint">Save to list</p>
      <ul className="max-h-64 overflow-y-auto">
        {lists.map((list) => {
          const saved = containing.includes(list.id);
          return (
            <li key={list.id}>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={saved}
                onClick={() => toggleInList(list.id, cardId)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-background"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                    saved ? "border-heart bg-heart text-surface" : "border-border"
                  }`}
                >
                  {saved ? <Check className="size-3.5" strokeWidth={2.5} /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{list.name}</span>
                <span className="text-xs tabular-nums text-faint">{list.cardIds.length}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-1 border-t border-border pt-1">
        {creating ? (
          <form onSubmit={submit} className="flex items-center gap-1.5 px-1.5 py-1.5">
            <label htmlFor={`new-list-${cardId}`} className="sr-only">
              New list name
            </label>
            <input
              id={`new-list-${cardId}`}
              autoFocus
              value={name}
              maxLength={MAX_LIST_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder="List name"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm placeholder:text-faint"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-foreground px-3 text-sm text-surface disabled:cursor-default disabled:opacity-40"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted hover:bg-background hover:text-foreground"
          >
            <Plus aria-hidden="true" className="size-4" />
            New list
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
