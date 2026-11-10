"use client";

import { useI18n, useLocaleRouter } from "@/components/i18n-provider";
import { SlidersHorizontal, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { DEFAULT_SORT, POKEMON_TYPES, SORT_OPTIONS } from "@/lib/tcg/constants";
import { buildExploreHref } from "@/lib/explore-params";
import { groupSetsBySeries } from "@/lib/format";
import type { CardSet, ExploreParams } from "@/types/catalog";

type FilterBarProps = {
  params: ExploreParams;
  sets: CardSet[];
  rarities: string[];
};

type FilterPatch = Partial<Pick<ExploreParams, "set" | "type" | "rarity" | "sort">>;

export function FilterBar({ params, sets, rarities }: FilterBarProps) {
  const router = useLocaleRouter();
  const { t } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const groups = groupSetsBySeries(sets, t.sets.other);
  const rarityOptions = rarities.includes(params.rarity) || !params.rarity ? rarities : [params.rarity, ...rarities];
  const active = activeFilters(params, sets, t);

  function update(patch: FilterPatch) {
    router.push(buildExploreHref(params, { ...patch, page: 1 }), { scroll: false });
  }

  function clearFilters() {
    router.push(buildExploreHref(params, { set: "", type: "", rarity: "", sort: DEFAULT_SORT, page: 1 }), { scroll: false });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm"
        >
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {t.explore.filtersSort}
          {active.length > 0 ? <span className="tabular-nums text-muted">{active.length}</span> : null}
        </button>
        {active.length > 0 ? (
          <button type="button" onClick={clearFilters} className="h-11 px-3 text-sm text-muted hover:text-foreground">
            {t.common.clear}
          </button>
        ) : null}
      </div>

      <div id={panelId} className={open ? "mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" : "hidden"}>
        <FilterControls params={params} groups={groups} rarities={rarityOptions} onChange={update} t={t} />
      </div>

      {active.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {active.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                onClick={() => {
                  if (filter.key === "set") update({ set: "" });
                  else if (filter.key === "type") update({ type: "" });
                  else if (filter.key === "rarity") update({ rarity: "" });
                  else update({ sort: DEFAULT_SORT });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs text-foreground"
                aria-label={t.explore.removeFilter(filter.label)}
              >
                {filter.label}
                <X aria-hidden="true" className="size-3 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FilterControls({
  params,
  groups,
  rarities,
  onChange,
  t,
}: {
  params: ExploreParams;
  groups: { series: string; sets: CardSet[] }[];
  rarities: string[];
  onChange: (patch: FilterPatch) => void;
  t: Dictionary;
}) {
  return (
    <>
      <SelectField id="filter-set" label={t.explore.set} value={params.set} onChange={(set) => onChange({ set })}>
        <option value="">{t.explore.allSets}</option>
        {groups.map((group) => (
          <optgroup key={group.series} label={group.series}>
            {group.sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>
      <SelectField id="filter-type" label={t.explore.type} value={params.type} onChange={(type) => onChange({ type })}>
        <option value="">{t.explore.allTypes}</option>
        {POKEMON_TYPES.map((type) => (
          <option key={type} value={type}>
            {t.types[type] ?? type}
          </option>
        ))}
      </SelectField>
      <SelectField id="filter-rarity" label={t.explore.rarity} value={params.rarity} onChange={(rarity) => onChange({ rarity })}>
        <option value="">{t.explore.allRarities}</option>
        {rarities.map((rarity) => (
          <option key={rarity} value={rarity}>
            {rarity}
          </option>
        ))}
      </SelectField>
      <SelectField
        id="filter-sort"
        label={t.explore.sort}
        value={params.sort}
        onChange={(sort) => {
          const next =
            sort === "oldest" || sort === "newest" || sort === "name" || sort === "number" ? sort : DEFAULT_SORT;
          onChange({ sort: next });
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {t.explore.sortOptions[option.value]}
          </option>
        ))}
      </SelectField>
    </>
  );
}

const selectChevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%23a8a29e' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

function SelectField({
  id,
  label,
  value,
  onChange,
  children,
  layout = "grid",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  layout?: "grid" | "inline";
}) {
  const inline = layout === "inline";

  return (
    <label
      htmlFor={id}
      className={
        inline
          ? "inline-block shrink-0"
          : "grid min-w-0 gap-1.5 text-xs text-muted md:min-w-40 md:flex-1"
      }
    >
      <span className={inline ? "sr-only" : undefined}>{label}</span>
      <span className="relative inline-block">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={
            inline
              ? "h-11 w-auto max-w-full cursor-pointer appearance-none rounded-full border border-border bg-surface bg-[length:12px] bg-[position:right_0.85rem_center] bg-no-repeat py-0 pr-9 pl-4 text-sm text-foreground"
              : "h-11 w-full appearance-none rounded-lg border border-border bg-surface bg-[length:12px] bg-[position:right_0.8rem_center] bg-no-repeat pr-8 pl-3 text-sm text-foreground"
          }
          style={{ backgroundImage: selectChevron }}
        >
          {children}
        </select>
      </span>
    </label>
  );
}

function activeFilters(params: ExploreParams, sets: CardSet[], t: Dictionary) {
  const filters: { key: "set" | "type" | "rarity" | "sort"; label: string }[] = [];
  if (params.set) {
    filters.push({ key: "set", label: sets.find((set) => set.id === params.set)?.name ?? params.set });
  }
  if (params.type) filters.push({ key: "type", label: t.types[params.type] ?? params.type });
  if (params.rarity) filters.push({ key: "rarity", label: params.rarity });
  if (params.sort !== DEFAULT_SORT) {
    filters.push({ key: "sort", label: t.explore.sortOptions[params.sort] ?? params.sort });
  }
  return filters;
}
