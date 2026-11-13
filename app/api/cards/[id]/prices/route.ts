import { NextResponse } from "next/server";
import { getDkkRates } from "@/lib/exchange-rates";
import { getCardPrices } from "@/lib/tcg/service";

/**
 * A card's market prices (and kroner rates for Danish pages), loaded by the card page in the
 * browser so the page itself can stay cached at the CDN. The CDN keeps each answer for six hours;
 * crawlers skip /api/ (robots.txt), so they never trigger it.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [prices, dkk] = await Promise.all([getCardPrices(id), getDkkRates().catch(() => null)]);
  return NextResponse.json(
    { prices, dkk },
    { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400" } },
  );
}
