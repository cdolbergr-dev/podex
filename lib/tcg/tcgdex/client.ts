import { TcgRequestError } from "@/lib/tcg/errors";

const API_BASE = "https://api.tcgdex.net/v2";
const MAX_ATTEMPTS = 4;

export function getTcgdexLang(): string {
  return process.env.TCGDEX_LANG?.trim() || "en";
}

export async function tcgdexFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const lang = getTcgdexLang();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE}/${lang}${normalized}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  let response: Response | null = null;

  // Retries dropped connections, rate limiting (429) and server errors, waiting 1, 2 and 4 seconds
  // (or what Retry-After asks, up to 10). The full catalog download makes ~24,000 requests, so a
  // brief hiccup at TCGdex must not fail the whole build.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const last = attempt === MAX_ATTEMPTS - 1;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (error) {
      if (last) throw new TcgRequestError(`The TCGdex catalog could not be reached (${String(error)}).`, 0);
      response = null;
    }
    if (response && (response.ok || (response.status < 500 && response.status !== 429))) break;
    if (last) break;
    const retryAfter = Number(response?.headers.get("retry-after"));
    const wait = retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : 1000 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  if (!response) {
    throw new TcgRequestError("The TCGdex catalog could not be reached. Try again in a moment.", 0);
  }

  if (response.status === 404) {
    throw new TcgRequestError("Not found", 404);
  }

  if (!response.ok) {
    throw new TcgRequestError(`The TCGdex catalog could not be reached (HTTP ${response.status}). Try again in a moment.`, response.status);
  }

  return (await response.json()) as T;
}
