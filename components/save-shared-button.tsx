"use client";

import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavorites } from "@/components/favorites-provider";

/** Saves a shared list as one of the visitor's own lists, under the sharer's name for it. */
export function SaveSharedButton({ ids, name }: { ids: string[]; name: string }) {
  const { ready, lists, createList } = useFavorites();
  const [shown, setShown] = useState(false);
  const [savedListId, setSavedListId] = useState<string | null>(null);

  useEffect(() => {
    // Saved state lives in localStorage, which the server cannot see.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  const known = shown && ready;
  const savedList = savedListId ? lists.find((list) => list.id === savedListId) : undefined;

  if (savedList) {
    return (
      <Link
        href={`/favorites?list=${encodeURIComponent(savedList.id)}`}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-heart/25 bg-heart-soft px-4 text-sm text-heart"
      >
        <Heart aria-hidden="true" strokeWidth={1.75} className="size-4 fill-current" />
        Saved as “{savedList.name}”
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setSavedListId(createList(name, ids))}
      disabled={!known}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-foreground px-4 text-sm text-surface transition-colors hover:opacity-90 disabled:cursor-default"
    >
      <Heart aria-hidden="true" strokeWidth={1.75} className="size-4" />
      Save as a list
    </button>
  );
}
