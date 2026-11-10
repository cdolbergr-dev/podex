/** "Mr. Mime" → "mr-mime", "Nidoran♀" → "nidoran-f", "Flabébé" → "flabebe". */
export function slugify(value: string): string {
  return value
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
