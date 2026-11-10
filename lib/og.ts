/** Satori (next/og) can't decode WebP; TCGdex serves the same art as PNG. */
export function ogImageUrl(src: string): string {
  if (src.includes("assets.tcgdex.net")) return src.replace(/\.webp$/i, ".png");
  return src;
}

export const ogColors = {
  background: "#f3f0ea",
  foreground: "#1c1917",
  muted: "#78716c",
  border: "#e4dfd6",
} as const;
