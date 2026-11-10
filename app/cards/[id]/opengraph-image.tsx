import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { cardNumberLabel } from "@/lib/format";
import { ogColors, ogImageUrl } from "@/lib/og";
import { getCard } from "@/lib/tcg/service";

export const alt = "Pokémon card on Podex";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCard(id).catch(() => null);
  const art = card ? card.images.large || card.images.small : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 72,
          padding: "40px 80px",
          background: ogColors.background,
          color: ogColors.foreground,
        }}
      >
        {art ? (
          <img
            src={ogImageUrl(art)}
            alt=""
            width={394}
            height={550}
            style={{ borderRadius: 18, boxShadow: "0 30px 60px -30px rgba(28,25,23,0.55)" }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 28, color: ogColors.muted }}>{brand.name}</div>
          <div style={{ marginTop: 24, fontSize: card && card.name.length > 18 ? 64 : 84, fontWeight: 600, lineHeight: 1.05 }}>
            {card?.name ?? "Pokémon card"}
          </div>
          {card ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28, fontSize: 32, color: ogColors.muted }}>
              <div>{card.set.name}</div>
              <div style={{ marginTop: 8 }}>
                {[cardNumberLabel(card), card.rarity].filter(Boolean).join(" · ")}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    ),
    size,
  );
}
