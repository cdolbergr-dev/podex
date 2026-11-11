import { nameMatchScore, normalizeCardNumber, scanFold } from "@/lib/scan-text";
import { loadAllCards } from "@/lib/tcg/service";
import type { Card } from "@/types/catalog";

export type ScanQuery = {
  /** Collector number as read ("025", "TG05"); empty when only the name was read. */
  number: string;
  total?: string;
  /** OCR text from the card's top band, where the name is printed. */
  nameText: string;
};

export type ScanMatch = {
  /** Best first. */
  cards: Card[];
  /** One card clearly fits; the scanner can show it without asking. */
  confident: boolean;
};

const MAX_RESULTS = 12;

/** Cards by normalized collector number, built once per loaded card list. */
const indexes = new WeakMap<Card[], Map<string, Card[]>>();

function numberIndex(cards: Card[]): Map<string, Card[]> {
  let index = indexes.get(cards);
  if (!index) {
    index = new Map();
    for (const card of cards) {
      const key = normalizeCardNumber(card.number);
      const list = index.get(key);
      if (list) list.push(card);
      else index.set(key, [card]);
    }
    indexes.set(cards, index);
  }
  return index;
}

function newestFirst(a: Card, b: Card): number {
  return (b.set.releaseDate ?? "").localeCompare(a.set.releaseDate ?? "");
}

function ranked(cards: Card[], nameText: string, total = 0): { card: Card; score: number; spelled: number }[] {
  // HP is printed beside the name; when the read text holds it, it separates same-named cards.
  const digits = nameText.replace(/\D+/g, " ");
  const hpRead = (card: Card) => (card.hp && card.hp.length >= 2 && digits.includes(card.hp) ? 0.15 : 0);
  // The set size printed on the card is printedTotal; total also counts secret rares.
  const printedSize = (card: Card) => (total && card.set.printedTotal === total ? 0.02 : 0);
  const text = scanFold(nameText);
  return cards
    .map((card) => {
      const folded = scanFold(card.name);
      // Spelled out in full in the text; on a tie the longer such name wins, since text
      // reading "Mewtwo" contains "Mew" too.
      const spelled = folded && text.includes(folded) ? folded.length : 0;
      return { card, spelled, score: nameMatchScore(card.name, nameText) + hpRead(card) + printedSize(card) };
    })
    .sort((a, b) => b.score - a.score || b.spelled - a.spelled || newestFirst(a.card, b.card));
}

/** Catalog cards that fit what the scanner read: collector number and set size, then the name. */
export async function matchScan(query: ScanQuery): Promise<ScanMatch> {
  const cards = await loadAllCards();
  // Evolution cards print "Evolves from Charmeleon" under the name: that name isn't this card's.
  const nameText = query.nameText.replace(/evol\w*\s+fr\w*[^\n]*/gi, " ").trim();
  const readName = nameText.replace(/[^A-Za-z]/g, "").length >= 3;

  if (!query.number) {
    if (!readName) return { cards: [], confident: false };
    const byName = ranked(cards, nameText).filter((entry) => entry.score >= 0.85);
    return { cards: byName.slice(0, MAX_RESULTS).map((entry) => entry.card), confident: false };
  }

  const sameNumber = numberIndex(cards).get(normalizeCardNumber(query.number)) ?? [];
  const total = Number(query.total) || 0;
  const sameSet = total
    ? sameNumber.filter((card) => card.set.printedTotal === total || card.set.total === total)
    : sameNumber;

  // A misread set size (or one printed differently from the catalog's) leaves only the number:
  // then the name has to agree.
  const pool =
    sameSet.length > 0
      ? ranked(sameSet, nameText, total)
      : ranked(sameNumber, nameText).filter((entry) => entry.score >= 0.6);
  if (pool.length === 0) return { cards: [], confident: false };

  const [best, second] = pool;
  // A name was read but fits none of several same-numbered cards: the number was probably
  // misread. Keep scanning.
  if (readName && pool.length > 1 && best.score < 0.4) return { cards: [], confident: false };

  const confident =
    (pool.length === 1 && (!readName || best.score >= 0.5)) ||
    (best.score >= 0.75 && best.score - (second?.score ?? 0) >= 0.25);

  return { cards: pool.slice(0, MAX_RESULTS).map((entry) => entry.card), confident };
}
