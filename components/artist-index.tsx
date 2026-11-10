"use client";

import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import type { ArtistSummary } from "@/lib/tcg/catalog-index";

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Artists A–Z, with a filter by name. */
export function ArtistIndex({ artists }: { artists: ArtistSummary[] }) {
  const { t, formatNumber } = useI18n();
  const [query, setQuery] = useState("");
  const needle = normalize(useDeferredValue(query).trim());
  const visible = needle ? artists.filter((artist) => normalize(artist.name).includes(needle)) : artists;

  return (
    <div>
      <label htmlFor="artist-filter" className="sr-only">
        {t.artists.filterLabel}
      </label>
      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input
          id="artist-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.artists.filterPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full rounded-full border border-border bg-surface pr-4 pl-11 text-base text-foreground placeholder:text-faint sm:text-sm"
        />
      </div>

      {visible.length === 0 ? <p className="mt-10 text-sm text-muted">{t.artists.noMatch}</p> : null}

      <ul className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((artist) => (
          <li key={artist.slug} className="border-b border-border">
            <LocaleLink
              href={`/artists/${artist.slug}`}
              className="flex items-baseline justify-between gap-4 py-3 text-sm hover:text-foreground"
            >
              <span className="min-w-0 truncate">{artist.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-faint">
                {t.artists.cards(formatNumber(artist.count), artist.count)}
              </span>
            </LocaleLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
