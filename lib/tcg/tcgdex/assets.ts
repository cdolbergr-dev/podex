export function tcgAssetUrl(base: string | undefined, extension = "webp"): string {
  const root = base?.trim();
  if (!root) return "";
  if (/\.(png|webp|jpg|jpeg)$/i.test(root)) return root;
  return `${root}.${extension}`;
}

export function tcgCardImageUrls(base: string | undefined): { small: string; large: string } {
  const root = base?.trim();
  if (!root) return { small: "", large: "" };
  return {
    small: `${root}/low.webp`,
    large: `${root}/high.webp`,
  };
}
