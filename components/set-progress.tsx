"use client";

import { useFavorites } from "@/components/favorites-provider";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { countOwnedInSet } from "@/lib/owned";

function useOwnedInSet(setId: string, longer: string[]) {
  const { owned, ready } = useFavorites();
  return ready ? countOwnedInSet(owned, setId, longer) : null;
}

function Bar({ value, total }: { value: number; total: number }) {
  const share = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-skeleton-soft">
      <span className="block h-full rounded-full bg-owned transition-[width] duration-500" style={{ width: `${share * 100}%` }} />
    </span>
  );
}

/** "You own 12 of 102" above a set's cards. */
export function SetProgress({ setId, total, longer }: { setId: string; total: number; longer: string[] }) {
  const { t, formatNumber } = useI18n();
  const count = useOwnedInSet(setId, longer);
  if (count === null || total === 0) return <div className="mt-4 h-10" aria-hidden="true" />;

  return (
    <div className="mt-4 max-w-sm">
      <p className="text-sm text-muted">
        {count === 0 ? t.owned.setHint : t.owned.setProgress(formatNumber(count), formatNumber(total))}
      </p>
      <div className="mt-2">
        <Bar value={count} total={total} />
      </div>
    </div>
  );
}

/** Compact progress on a set tile; nothing until the visitor owns a card from the set. */
export function SetTileProgress({ setId, total, longer }: { setId: string; total: number; longer: string[] }) {
  const { t, formatNumber } = useI18n();
  const count = useOwnedInSet(setId, longer);
  if (!count || total === 0) return null;

  return (
    <div className="mt-2" title={t.owned.setProgress(formatNumber(count), formatNumber(total))}>
      <p className="mb-1 text-xs tabular-nums text-owned">
        {formatNumber(count)} / {formatNumber(total)}
      </p>
      <Bar value={count} total={total} />
    </div>
  );
}

/** "You own 57 cards from 4 sets" on the Sets page. */
export function CollectionSummary({ sets }: { sets: { id: string; longer: string[] }[] }) {
  const { owned, ready } = useFavorites();
  const { t, formatNumber } = useI18n();
  if (!ready || owned.length === 0) return null;
  const started = sets.filter((set) => countOwnedInSet(owned, set.id, set.longer) > 0).length;
  return (
    <p className="text-sm">
      <LocaleLink href="/collection" className="text-owned underline decoration-owned/30 underline-offset-4 hover:decoration-owned">
        {t.owned.collectionSummary(formatNumber(owned.length), owned.length, started)}
      </LocaleLink>
    </p>
  );
}
