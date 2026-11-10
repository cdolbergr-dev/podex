"use client";

import { Heart } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { useI18n } from "@/components/i18n-provider";
import { SaveToListPicker } from "@/components/save-to-list-picker";

type FavoriteButtonProps = {
  id: string;
  name: string;
  variant?: "icon" | "label";
};

export function FavoriteButton({ id, name, variant = "icon" }: FavoriteButtonProps) {
  const { isFavorite, toggle, lists } = useFavorites();
  const { t } = useI18n();
  const [pulse, setPulse] = useState(0);
  const [shown, setShown] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Saved state lives in localStorage, which the server cannot see.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  const active = shown && isFavorite(id);
  // One list: the heart saves in one tap. Several lists (or the detail view's Save button, so
  // there's always a way to start another list): choose lists in the picker.
  // Lists live in localStorage, so only count them after mount (the server render can't).
  const usesPicker = variant === "label" || (shown && lists.length > 1);
  const label = usesPicker
    ? t.favorites.saveToListLabel(name)
    : active
      ? t.favorites.removeCard(name)
      : t.favorites.saveCard(name);

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (usesPicker) {
      const anchor = event.currentTarget;
      setPickerAnchor((current) => (current ? null : anchor));
      return;
    }
    toggle(id);
    setPulse((value) => value + 1);
  }

  const picker = pickerAnchor ? (
    <SaveToListPicker cardId={id} cardName={name} anchor={pickerAnchor} onClose={() => setPickerAnchor(null)} />
  ) : null;

  const icon = (
    <Heart
      key={pulse}
      aria-hidden="true"
      strokeWidth={1.75}
      className={`${variant === "icon" ? "size-3.5" : "size-4"} ${pulse > 0 ? "heart-pop" : ""} ${active ? "fill-current" : ""}`}
    />
  );

  // With a picker the button opens a menu rather than toggling, so expose that, not a pressed state.
  const buttonState = usesPicker
    ? { "aria-haspopup": "dialog" as const, "aria-expanded": pickerAnchor !== null }
    : { "aria-pressed": active };

  if (variant === "label") {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          {...buttonState}
          className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
            active
              ? "border-heart/25 bg-heart-soft text-heart"
              : "border-border bg-surface text-foreground hover:bg-surface-hover"
          }`}
        >
          {icon}
          {active ? t.favorites.saved : t.favorites.save}
        </button>
        {picker}
      </>
    );
  }

  // 44px tap target around a small translucent chip. On hover-capable devices the chip only
  // shows on tile hover/focus (or once saved, or while its picker is open), so it doesn't sit on
  // top of every card's art.
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        {...buttonState}
        className={`group/fav inline-flex size-11 cursor-pointer items-center justify-center transition-opacity duration-200 focus-visible:opacity-100 ${
          active || pickerAnchor ? "" : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        }`}
      >
        <span
          className={`inline-flex size-8 items-center justify-center rounded-full bg-surface/80 shadow-sm ring-1 ring-foreground/5 backdrop-blur-md transition-colors group-hover/fav:bg-surface ${
            active ? "text-heart" : "text-foreground/80"
          }`}
        >
          {icon}
        </span>
      </button>
      {picker}
    </>
  );
}
