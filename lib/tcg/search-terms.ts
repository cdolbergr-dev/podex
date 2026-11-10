/** Splits a search into lowercase words; every word must match somewhere on the card. */
export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 6);
}

/** Lowercase words used across card and set names, for spelling suggestions. */
export function vocabularyFrom(names: string[]): string[] {
  const words = new Set<string>();
  for (const name of names) {
    for (const word of name.toLowerCase().split(/[^\p{L}\p{N}'-]+/u)) {
      if (word.length >= 2) words.add(word);
    }
  }
  return [...words];
}

/** Optimal string alignment distance, bailing out once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prevPrev: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, prevPrev[j - 2] + 1);
      }
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prevPrev = prev;
    prev = row;
  }
  return prev[b.length];
}

function allowedTypos(word: string): number {
  if (word.length <= 3) return 0;
  if (word.length <= 5) return 1;
  if (word.length <= 9) return 2;
  return 3;
}

/**
 * Corrects words that appear nowhere in the vocabulary to their closest known word.
 * Returns null when nothing needed (or could be) corrected.
 */
export function suggestQuery(query: string, vocabulary: string[]): string | null {
  const terms = searchTerms(query);
  let changed = false;

  const corrected = terms.map((term) => {
    // Already a (partial) match for some word — leave it alone.
    if (/^\d/.test(term) || vocabulary.some((word) => word.includes(term))) return term;

    const max = allowedTypos(term);
    if (max === 0) return term;

    let best: string | null = null;
    let bestDistance = max + 1;
    for (const word of vocabulary) {
      const distance = editDistance(term, word, Math.min(max, bestDistance));
      if (distance < bestDistance || (distance === bestDistance && best && word.length < best.length)) {
        best = word;
        bestDistance = distance;
      }
    }
    if (best && bestDistance <= max) {
      changed = true;
      return best;
    }
    return term;
  });

  return changed ? corrected.join(" ") : null;
}
