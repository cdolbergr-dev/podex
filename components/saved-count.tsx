"use client";

import { useFavorites } from "@/components/favorites-provider";
import { useI18n } from "@/components/i18n-provider";

export function SavedCount({ variant = "badge" }: { variant?: "badge" | "text" }) {
  const { count, ready } = useFavorites();
  const { t } = useI18n();
  if (!ready || count === 0) return null;

  if (variant === "text") {
    return <span className="tabular-nums text-xs text-faint">{count}</span>;
  }

  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[10px] leading-5 font-medium text-surface tabular-nums">
      {count}
      <span className="sr-only"> {t.nav.saved}</span>
    </span>
  );
}
