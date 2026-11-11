import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { Card } from "@/types/catalog";

/**
 * A spreadsheet of owned cards. Danish and Spanish Excel expect ";" between columns (the
 * comma is their decimal mark), English ",". The byte-order mark makes Excel read UTF-8,
 * so names like "Flabébé" and "Nidoran♀" survive.
 */
export function collectionCsv(cards: Card[], locale: Locale, t: Dictionary, siteUrl: string): string {
  const separator = locale === "en" ? "," : ";";
  const cell = (value: string | undefined) => {
    const text = value ?? "";
    return /["\n\r,;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const path = locale === "en" ? "" : `/${locale}`;
  const rows = [
    t.collection.csvColumns,
    ...cards.map((card) => [
      card.set.name,
      card.set.releaseDate?.replace(/\//g, "-"),
      card.number,
      card.name,
      card.rarity,
      card.types.map((type) => t.types[type] ?? type).join(", "),
      card.artist,
      card.id,
      `${siteUrl}${path}/cards/${encodeURIComponent(card.id)}`,
    ]),
  ];
  return `﻿${rows.map((row) => row.map(cell).join(separator)).join("\r\n")}\r\n`;
}

export function downloadFile(contents: string, filename: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
