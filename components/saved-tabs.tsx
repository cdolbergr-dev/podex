"use client";

import { useEffect, useState } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { LocaleLink, useI18n } from "@/components/i18n-provider";

/** Switches between favorite lists and owned cards (both saved in this browser). */
export function SavedTabs({ active }: { active: "favorites" | "collection" }) {
  const { t, formatNumber } = useI18n();
  const { count, owned } = useFavorites();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Counts live in localStorage, which the server cannot see.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reveal after hydration
    setShown(true);
  }, []);

  const tabs = [
    { key: "favorites", href: "/favorites", label: t.collection.favoritesTab, count },
    { key: "collection", href: "/collection", label: t.collection.collectionTab, count: owned.length },
  ] as const;

  return (
    <nav aria-label={t.collection.tabsLabel} className="mb-8 inline-flex rounded-full border border-border bg-surface p-1">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <LocaleLink
            key={tab.key}
            href={tab.href}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
              selected ? "bg-foreground text-surface" : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {shown && tab.count > 0 ? (
              <span className={`text-xs tabular-nums ${selected ? "text-surface/70" : "text-faint"}`}>
                {formatNumber(tab.count)}
              </span>
            ) : null}
          </LocaleLink>
        );
      })}
    </nav>
  );
}
