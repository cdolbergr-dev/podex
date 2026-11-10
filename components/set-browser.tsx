import Link from "next/link";
import { Layers } from "lucide-react";
import { SetMark } from "@/components/set-mark";
import { formatReleaseDate, groupSetsBySeries, setCountLabel } from "@/lib/format";
import type { CardSet } from "@/types/catalog";

export function SetBrowser({ sets }: { sets: CardSet[] }) {
  const groups = groupSetsBySeries(sets);

  return (
    <div className="space-y-12">
      {groups.map((group) => (
        <section key={group.series} aria-labelledby={`series-${group.series}`}>
          <h2 id={`series-${group.series}`} className="text-sm text-muted">
            {group.series}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.sets.map((set) => (
              <li key={set.id}>
                <SetTile set={set} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SetTile({ set }: { set: CardSet }) {
  const released = formatReleaseDate(set.releaseDate);
  const count = setCountLabel(set);

  return (
    <Link
      href={`/?set=${encodeURIComponent(set.id)}`}
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
            {[released, count].filter(Boolean).join(" · ") || "Set details unavailable"}
          </p>
        </div>
        {set.images.logo && set.images.symbol ? (
          <SetMark src={set.images.symbol} alt="" sizes="24px" align="center" className="mt-0.5 size-5 shrink-0" />
        ) : null}
      </div>
    </Link>
  );
}
