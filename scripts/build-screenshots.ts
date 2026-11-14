/**
 * Captures the app screenshots listed in app/manifest.ts (public/screenshots) with headless
 * Chrome, in light mode. Start a production server first (next build + next start, so the dev
 * tools badge stays out of the shots), then:
 *   npm run build:screenshots -- http://localhost:3200
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/screenshots");
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const chrome = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Narrow shots are 540×960 CSS pixels at 2× (1080×1920); the wide one is 1920×1080 at 1×. */
const SHOTS = [
  { file: "home-narrow.png", path: "/", width: 540, height: 960, scale: 2 },
  { file: "card-narrow.png", path: "/cards/sv03.5-199", width: 540, height: 960, scale: 2 },
  { file: "set-narrow.png", path: "/sets/pitch-black", width: 540, height: 960, scale: 2 },
  { file: "home-wide.png", path: "/", width: 1920, height: 1080, scale: 1 },
];

mkdirSync(outDir, { recursive: true });
for (const shot of SHOTS) {
  const file = path.join(outDir, shot.file);
  execFileSync(chrome, [
    "--headless",
    "--hide-scrollbars",
    "--disable-gpu",
    "--blink-settings=preferredColorScheme=1",
    `--window-size=${shot.width},${shot.height}`,
    `--force-device-scale-factor=${shot.scale}`,
    // Let card art and fonts load before the capture.
    "--virtual-time-budget=8000",
    `--screenshot=${file}`,
    `${base}${shot.path}`,
  ], { stdio: "ignore" });
  console.log(`wrote public/screenshots/${shot.file}`);
}
