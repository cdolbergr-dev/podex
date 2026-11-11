/**
 * Reading a card from OCR text (the card scanner). Shared by the browser, which reads the
 * collector number off the camera image, and the server, which matches it against the catalog.
 */

export type ScannedNumber = {
  /** As printed, cleaned up: "025", "TG05", "SWSH001". */
  number: string;
  /** The set size after the slash ("198"); promos print none. */
  total?: string;
};

/** Letter prefixes printed before collector numbers (Trainer Gallery, Shiny Vault, …). */
const NUMBER_PREFIXES = ["HGSS", "SWSH", "TG", "GG", "SV", "RC", "SH", "SL", "SM", "XY", "BW", "DP", "H"];
/** Promo numbers print alone, without "/total". */
const PROMO_PREFIXES = ["SWSH", "HGSS", "SM", "XY", "BW", "DP"];

/** Letters OCR commonly reads in place of digits. */
const DIGIT_LOOKALIKES: Record<string, string> = { O: "0", D: "0", Q: "0", I: "1", L: "1", "|": "1", Z: "2", S: "5", B: "8" };

function toDigits(value: string): string {
  return [...value].map((char) => DIGIT_LOOKALIKES[char] ?? char).join("");
}

/** Splits "TG05" into a known prefix and the rest; an unknown "prefix" is a misread digit. */
function splitPrefix(raw: string): { prefix: string; digits: string } {
  const prefix = NUMBER_PREFIXES.find((candidate) => raw.startsWith(candidate) && /\d/.test(raw.slice(candidate.length)));
  const rest = prefix ? raw.slice(prefix.length) : raw;
  return { prefix: prefix ?? "", digits: toDigits(rest) };
}

/**
 * Finds the collector number ("025/198", "TG05/TG30", "4/102", "SWSH001") in OCR text from the
 * bottom of a card. Returns null when there is none that looks plausible.
 */
export function parseCollectorNumber(text: string): ScannedNumber | null {
  const upper = text.toUpperCase().replace(/[\\|]/g, "/");

  for (const match of upper.matchAll(/([A-Z0-9]{1,7})\s*\/\s*([A-Z0-9]{1,6})/g)) {
    const left = splitPrefix(match[1].replace(/^[^A-Z0-9]+/, ""));
    const right = splitPrefix(match[2]);
    // Keep the last 3 digits: text just before the number (e.g. a regulation mark) can stick to it.
    const number = left.digits.match(/\d{1,3}$/)?.[0];
    const total = right.digits.match(/^\d{2,3}/)?.[0];
    if (!number || !total || Number(total) === 0) continue;
    // Numbers well past the set size are misreads (secret rares go a little over, not 10×).
    if (!left.prefix && Number(number) > Number(total) * 2 + 20) continue;
    return { number: `${left.prefix}${number}`, total };
  }

  for (const prefix of PROMO_PREFIXES) {
    const match = upper.match(new RegExp(`${prefix}\\s?([0-9OISB]{2,3})(?![0-9])`));
    const digits = match ? toDigits(match[1]) : "";
    if (/^\d+$/.test(digits)) return { number: `${prefix}${digits}` };
  }

  return null;
}

/** "025" → "25", "TG05" → "TG5": collector numbers compare without leading zeros. */
export function normalizeCardNumber(value: string): string {
  return value.toUpperCase().replace(/^([A-Z]*)0+(?=\d)/, "$1");
}

/** Lowercase letters and digits only, accents removed: "Flabébé ex" → "flabebeex". */
export function scanFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function bigrams(value: string): string[] {
  const grams: string[] = [];
  for (let index = 0; index < value.length - 1; index += 1) grams.push(value.slice(index, index + 2));
  return grams;
}

/**
 * How much of a card name appears in OCR text from the card's top band (0–1). The text also
 * holds "BASIC", "HP 120" and misreads, so this measures the name's letter pairs found in the
 * text, not overall similarity.
 */
export function nameMatchScore(name: string, ocrText: string): number {
  const text = scanFold(ocrText);
  const score = containment(scanFold(name), text);
  // The "ex"/"V" mark is printed as a logo OCR often misses: a read base name nearly counts.
  const base = name.replace(MECHANIC_SUFFIX, "");
  return base === name ? score : Math.max(score, containment(scanFold(base), text) - 0.05);
}

/** Card-name suffixes printed as logos rather than text. */
const MECHANIC_SUFFIX = /\s+(ex|EX|GX|V|VMAX|VSTAR|V-UNION|BREAK|LV\.X|Prime|LEGEND|δ|☆|◇)$/;

function containment(target: string, text: string): number {
  // Names under three letters ("N") turn up inside any text.
  if (target.length < 3 || !text) return 0;
  if (text.includes(target)) return 1;
  const pairs = bigrams(target);
  if (pairs.length === 0) return 0;
  const available = new Map<string, number>();
  for (const gram of bigrams(text)) available.set(gram, (available.get(gram) ?? 0) + 1);
  let found = 0;
  for (const gram of pairs) {
    const left = available.get(gram) ?? 0;
    if (left > 0) {
      found += 1;
      available.set(gram, left - 1);
    }
  }
  return found / pairs.length;
}
