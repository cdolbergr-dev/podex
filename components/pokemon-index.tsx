"use client";

import Image from "next/image";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { dexLabel, generationOf, romanNumeral } from "@/lib/generations";
import type { PokemonSummary } from "@/lib/tcg/catalog-index";

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Every Pokémon by generation, with a filter by name or Pokédex number. */
export function PokemonIndex({ pokemon }: { pokemon: PokemonSummary[] }) {
  const { t, formatNumber } = useI18n();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const needle = normalize(deferred.trim().replace(/^#/, ""));
  const number = /^\d+$/.test(needle) ? Number(needle) : null;
  const visible = needle
    ? pokemon.filter((entry) => (number !== null ? String(entry.dex).startsWith(needle) : normalize(entry.name).includes(needle)))
    : pokemon;

  const groups = new Map<number, PokemonSummary[]>();
  for (const entry of visible) {
    const generation = generationOf(entry.dex);
    groups.set(generation, [...(groups.get(generation) ?? []), entry]);
  }

  return (
    <div>
      <label htmlFor="pokemon-filter" className="sr-only">
        {t.pokemon.filterLabel}
      </label>
      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input
          id="pokemon-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.pokemon.filterPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full rounded-full border border-border bg-surface pr-4 pl-11 text-base text-foreground placeholder:text-faint sm:text-sm"
        />
      </div>

      {visible.length === 0 ? <p className="mt-10 text-sm text-muted">{t.pokemon.noMatch}</p> : null}

      <div className="mt-10 space-y-12">
        {[...groups.entries()].map(([generation, entries]) => (
          <section key={generation} aria-labelledby={`generation-${generation}`}>
            <h2 id={`generation-${generation}`} className="text-sm text-muted">
              {generation > 9 ? t.pokemon.otherGeneration : t.pokemon.generation(romanNumeral(generation))}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {entries.map((entry) => (
                <li key={entry.dex}>
                  <LocaleLink
                    href={`/pokemon/${entry.slug}`}
                    className="group flex h-full items-center gap-3 rounded-xl border border-border bg-surface p-2.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-24px_rgba(28,25,23,0.45)] motion-reduce:transform-none"
                  >
                    <span className="relative aspect-[63/88] w-10 shrink-0 overflow-hidden rounded-[3px] bg-art">
                      {entry.image ? (
                        <Image src={entry.image} alt="" fill sizes="40px" className="object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium tracking-tight">{entry.name}</span>
                      <span className="block text-xs tabular-nums text-faint">
                        {dexLabel(entry.dex)} · {t.pokemon.cards(formatNumber(entry.count), entry.count)}
                      </span>
                    </span>
                  </LocaleLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
