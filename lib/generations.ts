/** Last national Pokédex number of each generation. */
const GENERATION_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** 1-based generation of a Pokédex number; numbers past the last known one count as the next. */
export function generationOf(dex: number): number {
  const index = GENERATION_ENDS.findIndex((end) => dex <= end);
  return index === -1 ? GENERATION_ENDS.length + 1 : index + 1;
}

export function romanNumeral(value: number): string {
  return ROMAN[value - 1] ?? String(value);
}

/** "#025" — three digits like the games, four once numbers get there. */
export function dexLabel(dex: number): string {
  return `#${String(dex).padStart(3, "0")}`;
}
