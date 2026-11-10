import type { Card, CardSet } from "@/types/catalog";

const INTL: Record<string, string> = { en: "en-US", da: "da-DK", es: "es-ES" };

export function formatCount(value: number, locale = "en"): string {
  return new Intl.NumberFormat(INTL[locale] ?? "en-US").format(value);
}

/** "2026/09/16" → "September 16, 2026" (or the locale's form, e.g. "16. september 2026"). */
export function formatReleaseDate(value: string | undefined, locale = "en"): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("/").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return value;
  return new Intl.DateTimeFormat(INTL[locale] ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1, day));
}

export function cardNumberLabel(card: Card): string {
  const total = card.set.printedTotal || card.set.total;
  return total ? `${card.number} / ${total}` : card.number;
}

export function cardMetaLabel(card: Card): string {
  const bits = [card.number];
  if (card.rarity) bits.push(card.rarity);
  return bits.join(" · ");
}

export function groupSetsBySeries(sets: CardSet[], otherLabel = "Other"): { series: string; sets: CardSet[] }[] {
  const sorted = [...sets].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  const order: string[] = [];
  const groups = new Map<string, CardSet[]>();

  for (const set of sorted) {
    const series = set.series || otherLabel;
    const existing = groups.get(series);
    if (existing) {
      existing.push(set);
    } else {
      groups.set(series, [set]);
      order.push(series);
    }
  }

  return order.map((series) => ({ series, sets: groups.get(series) ?? [] }));
}

export function legalFormatLabel(
  card: Card,
  names: { standard: string; expanded: string; unlimited: string } = {
    standard: "Standard",
    expanded: "Expanded",
    unlimited: "Unlimited",
  },
): string | null {
  const legalities = card.legalities;
  if (!legalities) return null;

  const labels: string[] = [];
  if (legalities.standard === "Legal") labels.push(names.standard);
  if (legalities.expanded === "Legal") labels.push(names.expanded);
  if (legalities.unlimited === "Legal") labels.push(names.unlimited);
  if (labels.length === 0) return null;
  return labels.join(", ");
}
