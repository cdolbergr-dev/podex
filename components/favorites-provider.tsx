"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  cleanListName,
  DEFAULT_LIST_NAME,
  FAVORITES_CHANGE_EVENT,
  newListId,
  parseFavoriteSnapshot,
  readFavoriteLists,
  readFavoriteSnapshot,
  writeFavoriteLists,
  type FavoriteList,
} from "@/lib/favorites-storage";

type FavoritesContextValue = {
  lists: FavoriteList[];
  /** Every saved card across all lists (unique, in list order). */
  ids: string[];
  ready: boolean;
  count: number;
  /** Saved in at least one list. */
  isFavorite: (id: string) => boolean;
  /** Ids of the lists containing a card. */
  listsContaining: (cardId: string) => string[];
  /** Quick save/unsave in the first list — the heart's one-tap action with a single list. */
  toggle: (id: string) => void;
  toggleInList: (listId: string, cardId: string) => void;
  /** Creates a list (optionally with cards) and returns its id. */
  createList: (name: string, cardIds?: string[]) => string;
  renameList: (listId: string, name: string) => void;
  /** Deletes a list; the last remaining list is emptied instead so there is always one. */
  deleteList: (listId: string) => void;
  /** Adds ids not already in the list, keeping its order. Returns how many were new. */
  addMany: (ids: string[], listId?: string) => number;
  clear: (listId?: string) => void;
  /**
   * Restores lists from a backup in one write: same-named lists get the missing cards, others
   * are created. Returns how many cards were added.
   */
  mergeLists: (incoming: { name: string; cardIds: string[] }[]) => number;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const PENDING_SNAPSHOT = "";
const EMPTY_SNAPSHOT = "legacy:[]";

let clientReady = false;
let cachedSnapshot = PENDING_SNAPSHOT;

function getServerSnapshot() {
  return PENDING_SNAPSHOT;
}

function getSnapshot() {
  if (!clientReady) return PENDING_SNAPSHOT;
  const next = readFavoriteSnapshot();
  if (next !== cachedSnapshot) cachedSnapshot = next;
  return cachedSnapshot;
}

function subscribe(onStoreChange: () => void) {
  const timeout = window.setTimeout(() => {
    clientReady = true;
    onStoreChange();
  }, 0);
  const notify = () => onStoreChange();
  window.addEventListener("storage", notify);
  window.addEventListener(FAVORITES_CHANGE_EVENT, notify);
  return () => {
    window.clearTimeout(timeout);
    window.removeEventListener("storage", notify);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, notify);
  };
}

/** Applies a change to the stored lists; storage failures leave things as they were. */
function updateLists(change: (lists: FavoriteList[]) => FavoriteList[]) {
  try {
    writeFavoriteLists(change(readFavoriteLists()));
  } catch {
    // Leave storage unchanged if the browser blocks it.
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = snapshot !== PENDING_SNAPSHOT;
  const lists = useMemo(() => parseFavoriteSnapshot(ready ? snapshot : EMPTY_SNAPSHOT), [ready, snapshot]);
  const ids = useMemo(() => [...new Set(lists.flatMap((list) => list.cardIds))], [lists]);

  const toggleInList = useCallback((listId: string, cardId: string) => {
    updateLists((current) =>
      current.map((list) =>
        list.id !== listId
          ? list
          : {
              ...list,
              cardIds: list.cardIds.includes(cardId)
                ? list.cardIds.filter((id) => id !== cardId)
                : [...list.cardIds, cardId],
            },
      ),
    );
  }, []);

  const toggle = useCallback(
    (cardId: string) => {
      const [first] = readFavoriteLists();
      if (first) toggleInList(first.id, cardId);
    },
    [toggleInList],
  );

  const createList = useCallback((name: string, cardIds: string[] = []) => {
    const id = newListId();
    updateLists((current) => [
      ...current,
      { id, name: cleanListName(name) || DEFAULT_LIST_NAME, cardIds: [...new Set(cardIds)] },
    ]);
    return id;
  }, []);

  const renameList = useCallback((listId: string, name: string) => {
    const cleaned = cleanListName(name);
    if (!cleaned) return;
    updateLists((current) => current.map((list) => (list.id === listId ? { ...list, name: cleaned } : list)));
  }, []);

  const deleteList = useCallback((listId: string) => {
    updateLists((current) => {
      if (current.length <= 1) return current.map((list) => ({ ...list, cardIds: [] }));
      return current.filter((list) => list.id !== listId);
    });
  }, []);

  const addMany = useCallback((add: string[], listId?: string) => {
    let added = 0;
    updateLists((current) => {
      const targetId = listId ?? current[0]?.id;
      return current.map((list) => {
        if (list.id !== targetId) return list;
        const fresh = add.filter((id) => !list.cardIds.includes(id));
        added = fresh.length;
        return { ...list, cardIds: [...list.cardIds, ...fresh] };
      });
    });
    return added;
  }, []);

  const clear = useCallback((listId?: string) => {
    updateLists((current) =>
      current.map((list) => (listId === undefined || list.id === listId ? { ...list, cardIds: [] } : list)),
    );
  }, []);

  const mergeLists = useCallback((incoming: { name: string; cardIds: string[] }[]) => {
    let added = 0;
    updateLists((current) => {
      const next = current.map((list) => ({ ...list, cardIds: [...list.cardIds] }));
      // A browser that has never saved anything only holds the empty default list: fill it.
      const onlyEmptyDefault = next.length === 1 && next[0].cardIds.length === 0;
      incoming.forEach((list, index) => {
        const match =
          onlyEmptyDefault && index === 0
            ? next[0]
            : next.find((existing) => existing.name.toLowerCase() === cleanListName(list.name).toLowerCase());
        if (match) {
          if (onlyEmptyDefault && index === 0) match.name = cleanListName(list.name) || match.name;
          const fresh = list.cardIds.filter((id) => !match.cardIds.includes(id));
          match.cardIds.push(...fresh);
          added += fresh.length;
        } else {
          next.push({ id: newListId(), name: cleanListName(list.name) || DEFAULT_LIST_NAME, cardIds: [...list.cardIds] });
          added += list.cardIds.length;
        }
      });
      return next;
    });
    return added;
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      lists,
      ids,
      ready,
      count: ids.length,
      isFavorite: (id: string) => ids.includes(id),
      listsContaining: (cardId: string) => lists.filter((list) => list.cardIds.includes(cardId)).map((list) => list.id),
      toggle,
      toggleInList,
      createList,
      renameList,
      deleteList,
      addMany,
      clear,
      mergeLists,
    }),
    [lists, ids, ready, toggle, toggleInList, createList, renameList, deleteList, addMany, clear, mergeLists],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used within FavoritesProvider");
  return value;
}
