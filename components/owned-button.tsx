"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { useI18n } from "@/components/i18n-provider";

/**
 * "I own this" toggle. The label variant sits next to Save on the card page; the icon variant
 * is the tile's corner chip — always shown once owned, otherwise on hover (or always, when
 * `alwaysVisible`, e.g. while checking off a set).
 */
export function OwnedButton({
  id,
  name,
  variant = "icon",
  alwaysVisible = false,
}: {
  id: string;
  name: string;
  variant?: "icon" | "label";
  alwaysVisible?: boolean;
}) {
  const { isOwned, toggleOwned } = useFavorites();
  const { t } = useI18n();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Owned cards live in localStorage, which the server cannot see.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  const owned = shown && isOwned(id);
  const label = owned ? t.owned.removeCard(name) : t.owned.markCard(name);

  if (variant === "label") {
    return (
      <button
        type="button"
        onClick={() => toggleOwned(id)}
        aria-pressed={owned}
        aria-label={label}
        className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
          owned
            ? "border-owned/25 bg-owned-soft text-owned"
            : "border-border bg-surface text-foreground hover:bg-surface-hover"
        }`}
      >
        <Check aria-hidden="true" strokeWidth={owned ? 2.5 : 1.75} className="size-4" />
        {owned ? t.owned.owned : t.owned.own}
      </button>
    );
  }

  const visibility =
    owned || alwaysVisible
      ? ""
      : "opacity-0 focus-visible:opacity-100 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:none)]:hidden";

  return (
    <button
      type="button"
      onClick={() => toggleOwned(id)}
      aria-pressed={owned}
      aria-label={label}
      title={label}
      className={`group/own inline-flex size-11 cursor-pointer items-center justify-center transition-opacity duration-200 ${visibility}`}
    >
      <span
        className={`inline-flex size-8 items-center justify-center rounded-full shadow-sm ring-1 backdrop-blur-md transition-colors ${
          owned
            ? "bg-owned text-surface ring-owned/20"
            : "bg-surface/80 text-foreground/70 ring-foreground/5 group-hover/own:bg-surface"
        }`}
      >
        <Check aria-hidden="true" strokeWidth={2.25} className="size-3.5" />
      </span>
    </button>
  );
}
