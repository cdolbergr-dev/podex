import { tcgdexFetch } from "@/lib/tcg/tcgdex/client";
import type { CardPrices } from "@/types/catalog";

type Raw = Record<string, unknown>;

const asRecord = (value: unknown): Raw | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : null;
const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

/**
 * CardNexus link for a Cardmarket product. With a partner ID (from Impact) it goes through
 * CardNexus' affiliate redirect so sales are credited; without one it is a plain link.
 */
function cardnexusLink(cardmarketId: number, name: string): CardPrices["cardnexus"] {
  const partnerId = process.env.CARDNEXUS_PARTNER_ID?.trim();
  if (!partnerId) return { url: `https://cardnexus.com/go?cm=${cardmarketId}`, affiliate: false };
  return {
    url: `https://af.cardnexus.link/${encodeURIComponent(partnerId)}/cm/${cardmarketId}/${encodeURIComponent(name)}`,
    affiliate: true,
  };
}

/** Current Cardmarket (EUR) prices for a card from TCGdex, with a link to buy it on CardNexus. */
export async function getTcgdexCardPrices(id: string): Promise<CardPrices | null> {
  const card = await tcgdexFetch<Raw>(`/cards/${encodeURIComponent(id)}`);
  const cardmarket = asRecord(asRecord(card.pricing)?.cardmarket);
  if (!cardmarket) return null;

  const trend = asNumber(cardmarket.trend) ?? asNumber(cardmarket["trend-holo"]);
  const avg30 = asNumber(cardmarket.avg30) ?? asNumber(cardmarket["avg30-holo"]);
  const productId = asNumber(cardmarket.idProduct);

  if (trend === null && productId === null) return null;

  return {
    cardmarket: trend !== null ? { currency: "EUR", trend, avg30: avg30 ?? undefined } : undefined,
    cardnexus: productId !== null ? cardnexusLink(productId, typeof card.name === "string" ? card.name : "") : undefined,
    updated: typeof cardmarket.updated === "string" ? cardmarket.updated : undefined,
  };
}
