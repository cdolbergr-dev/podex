import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { ogColors } from "@/lib/og";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FANNED = [
  { src: "https://assets.tcgdex.net/en/base/base1/15/high.png", rotate: -10, x: 0 },
  { src: "https://assets.tcgdex.net/en/base/base1/2/high.png", rotate: 8, x: 150 },
  { src: "https://assets.tcgdex.net/en/base/base1/4/high.png", rotate: -1, x: 75 },
];

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = dictionaries[isLocale(lang) ? lang : DEFAULT_LOCALE];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: ogColors.background,
          color: ogColors.foreground,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 32, color: ogColors.muted }}>{brand.name}</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 24, fontSize: 76, fontWeight: 600, lineHeight: 1.08 }}>
            <div>{t.meta.headlineLead}</div>
            <div>{t.meta.headlineRest}</div>
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: ogColors.muted }}>{t.meta.tagline}</div>
        </div>
        <div style={{ display: "flex", position: "relative", width: 470, height: 520 }}>
          {FANNED.map((card) => (
            <img
              key={card.src}
              src={card.src}
              alt=""
              width={320}
              height={447}
              style={{
                position: "absolute",
                left: card.x,
                top: 36,
                borderRadius: 14,
                transform: `rotate(${card.rotate}deg)`,
                boxShadow: "0 30px 60px -30px rgba(28,25,23,0.55)",
              }}
            />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
