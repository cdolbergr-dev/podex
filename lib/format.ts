import type { Card, CardSet } from "@/types/catalog";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatReleaseDate(value: string | undefined): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("/").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) return value;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
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

export function setCountLabel(set: CardSet): string | null {
  if (!set.printedTotal && !set.total) return null;
  if (set.printedTotal && set.total && set.total !== set.printedTotal) {
    return `${formatCount(set.printedTotal)} cards · ${formatCount(set.total)} total`;
  }
  const count = set.printedTotal || set.total;
  return count ? `${formatCount(count)} cards` : null;
}

export function groupSetsBySeries(sets: CardSet[]): { series: string; sets: CardSet[] }[] {
  const sorted = [...sets].sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  const order: string[] = [];
  const groups = new Map<string, CardSet[]>();

  for (const set of sorted) {
    const series = set.series || "Other";
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

export function legalFormatLabel(card: Card): string | null {
  const legalities = card.legalities;
  if (!legalities) return null;

  const labels: string[] = [];
  if (legalities.standard === "Legal") labels.push("Standard");
  if (legalities.expanded === "Legal") labels.push("Expanded");
  if (legalities.unlimited === "Legal") labels.push("Unlimited");
  if (labels.length === 0) return null;
  return labels.join(", ");
}
