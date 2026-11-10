import { tcgdexFetch } from "@/lib/tcg/tcgdex/client";
import type { CardPrices, CardPriceVariant } from "@/types/catalog";

type Raw = Record<string, unknown>;

const asRecord = (value: unknown): Raw | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

const TCGPLAYER_VARIANTS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  "reverse-holofoil": "Reverse holo",
  "1st-edition": "1st Edition",
  "1st-edition-holofoil": "1st Edition holo",
  "unlimited-holofoil": "Unlimited holo",
};

function variantLabel(key: string): string {
  return TCGPLAYER_VARIANTS[key] ?? key.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Current market prices for a card from TCGdex (TCGplayer USD, Cardmarket EUR). */
export async function getTcgdexCardPrices(id: string): Promise<CardPrices | null> {
  const card = await tcgdexFetch<Raw>(`/cards/${encodeURIComponent(id)}`);
  const pricing = asRecord(card.pricing);
  if (!pricing) return null;

  const tcgplayer = asRecord(pricing.tcgplayer);
  const variants: CardPriceVariant[] = [];
  let tcgplayerProductId: number | null = null;
  if (tcgplayer) {
    for (const [key, value] of Object.entries(tcgplayer)) {
      const variant = asRecord(value);
      const market = asNumber(variant?.marketPrice) ?? asNumber(variant?.midPrice);
      if (!variant || market === null) continue;
      variants.push({ label: variantLabel(key), price: market });
      tcgplayerProductId ??= asNumber(variant.productId);
    }
  }

  const cardmarket = asRecord(pricing.cardmarket);
  const trend = asNumber(cardmarket?.trend) ?? asNumber(cardmarket?.["trend-holo"]);
  const avg30 = asNumber(cardmarket?.avg30) ?? asNumber(cardmarket?.["avg30-holo"]);

  if (variants.length === 0 && trend === null) return null;

  const updated = [tcgplayer?.updated, cardmarket?.updated].find((value): value is string => typeof value === "string");

  return {
    tcgplayer:
      variants.length > 0
        ? {
            currency: "USD",
            variants: variants.slice(0, 3),
            url: tcgplayerProductId ? `https://www.tcgplayer.com/product/${tcgplayerProductId}` : undefined,
          }
        : undefined,
    cardmarket: trend !== null ? { currency: "EUR", trend, avg30: avg30 ?? undefined } : undefined,
    updated,
  };
}
