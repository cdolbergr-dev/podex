import { cacheLife } from "next/cache";

/** Kroner per euro and per US dollar, from the ECB's daily reference rates. */
export type DkkRates = { eur: number; usd: number; date: string };

async function fetchDkkRates(): Promise<DkkRates | null> {
  try {
    // Frankfurter: a free, keyless mirror of the European Central Bank's reference rates.
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=DKK,USD", {
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { date?: string; rates?: { DKK?: number; USD?: number } };
    const dkk = data.rates?.DKK;
    const usd = data.rates?.USD;
    if (!dkk || !usd || !data.date) return null;
    return { eur: dkk, usd: dkk / usd, date: data.date };
  } catch {
    return null;
  }
}

/** Cached for half a day (the ECB publishes once per working day). Null if unavailable. */
export async function getDkkRates(): Promise<DkkRates | null> {
  "use cache";
  cacheLife("hours");
  return fetchDkkRates();
}
