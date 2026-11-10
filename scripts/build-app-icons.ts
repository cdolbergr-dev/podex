/**
 * Renders the installable-app icons (public/icons, app/apple-icon.png) from app/icon.svg.
 * Run after changing the logo: npm run build:app-icons
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/icons");

/** Logo on a full-bleed square, optionally shrunk so it survives Android's mask shapes. */
function variant(svg: string, { scale }: { scale: number }): string {
  const square = svg.replace('<rect width="32" height="32" rx="8" fill="#1c1917"/>', '<rect width="32" height="32" fill="#1c1917"/>');
  const [head, body] = square.split("</defs>");
  const [bg, ...rest] = body.split("\n").filter((line) => line.trim().length > 0);
  const content = rest.join("\n").replace("</svg>", "");
  return `${head}</defs>\n${bg}\n<g transform="translate(16 16) scale(${scale}) translate(-16 -16)">\n${content}\n</g>\n</svg>`;
}

async function render(svg: string, size: number, file: string) {
  await sharp(Buffer.from(svg), { density: (72 * size) / 32 })
    .resize(size, size)
    .png()
    .toFile(path.join(root, file));
  console.log(`wrote ${file}`);
}

async function main() {
  const svg = await readFile(path.join(root, "app/icon.svg"), "utf8");
  await mkdir(outDir, { recursive: true });

  const full = variant(svg, { scale: 1 });
  await render(full, 192, "public/icons/icon-192.png");
  await render(full, 512, "public/icons/icon-512.png");
  // iOS ignores transparency and rounds the corners itself. app/apple-icon.png is Next's file
  // convention for the apple-touch-icon link.
  await render(full, 180, "app/apple-icon.png");
  // Maskable icons are cropped to a circle/squircle: keep the card inside the central safe zone.
  const maskable = variant(svg, { scale: 0.72 });
  await render(maskable, 512, "public/icons/icon-maskable-512.png");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
