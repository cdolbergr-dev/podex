"use client";

import { Check, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { sharedFavoritesPath } from "@/lib/card-ids";

/** Share sheet on devices that have one; otherwise copies the link. */
export function ShareFavoritesButton({ ids, name }: { ids: string[]; name?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function share() {
    const url = new URL(sharedFavoritesPath(ids, name), window.location.origin).toString();
    const canShareSheet = typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;

    if (canShareSheet) {
      try {
        await navigator.share({ title: name ? `${name} · Pokémon cards` : "My Pokémon card favorites", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link to share your favorites:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-hover"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Share aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
