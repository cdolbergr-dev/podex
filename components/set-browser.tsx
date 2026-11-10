import { Layers } from "lucide-react";
import { SetMark } from "@/components/set-mark";
import { LocaleLink } from "@/components/i18n-provider";
import { CollectionSummary, SetTileProgress } from "@/components/set-progress";
import { longerSetIds, setCardTotal } from "@/lib/owned";
import { setPath } from "@/lib/set-path";
import { formatCount, formatReleaseDate, groupSetsBySeries } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import type { CardSet } from "@/types/catalog";

export async function SetBrowser({ sets }: { sets: CardSet[] }) {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const groups = groupSetsBySeries(sets, t.sets.other);
  const longer = new Map(sets.map((set) => [set.id, longerSetIds(set, sets)]));

  return (
    <div className="space-y-12">
      <CollectionSummary sets={sets.map((set) => ({ id: set.id, longer: longer.get(set.id) ?? [] }))} />
      {groups.map((group) => (
        <section key={group.series} aria-labelledby={`series-${group.series}`}>
          <h2 id={`series-${group.series}`} className="text-sm text-muted">
            {group.series}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.sets.map((set) => (
              <li key={set.id}>
                <SetTile set={set} locale={locale} t={t} longer={longer.get(set.id) ?? []} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function setCountLabel(set: CardSet, locale: Locale, t: Dictionary): string | null {
  if (set.printedTotal && set.total && set.total !== set.printedTotal) {
    return t.sets.cardsWithTotal(formatCount(set.printedTotal, locale), formatCount(set.total, locale));
  }
  const count = set.printedTotal || set.total;
  return count ? t.sets.cards(formatCount(count, locale)) : null;
}

function SetTile({ set, locale, t, longer }: { set: CardSet; locale: Locale; t: Dictionary; longer: string[] }) {
  const released = formatReleaseDate(set.releaseDate, locale);
  const count = setCountLabel(set, locale, t);

  return (
    <LocaleLink
      href={setPath(set)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-24px_rgba(28,25,23,0.45)] motion-reduce:transform-none"
    >
      <div className="flex h-28 items-center justify-center bg-panel px-8 py-5">
        {set.images.logo ? (
          <SetMark src={set.images.logo} alt="" sizes="240px" align="center" className="size-full" />
        ) : set.images.symbol ? (
          <SetMark src={set.images.symbol} alt="" sizes="48px" align="center" className="size-10" />
        ) : (
          <Layers aria-hidden="true" className="size-8 text-faint/60" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium tracking-tight">{set.name}</h3>
          <p className="mt-0.5 truncate text-xs leading-5 text-muted">
            {[released, count].filter(Boolean).join(" · ") || t.sets.detailsUnavailable}
          </p>
          <SetTileProgress setId={set.id} total={setCardTotal(set)} longer={longer} />
        </div>
        {set.images.logo && set.images.symbol ? (
          <SetMark src={set.images.symbol} alt="" sizes="24px" align="center" className="mt-0.5 size-5 shrink-0" />
        ) : null}
      </div>
    </LocaleLink>
  );
}
