import { TcgRequestError } from "@/lib/tcg/errors";

const API_BASE = "https://api.tcgdex.net/v2";

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

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, { headers: { Accept: "application/json" } });
    if (response.ok || response.status < 500 || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }

  if (!response) {
    throw new TcgRequestError("The TCGdex catalog could not be reached. Try again in a moment.", 0);
  }

  if (response.status === 404) {
    throw new TcgRequestError("Not found", 404);
  }

  if (!response.ok) {
    throw new TcgRequestError("The TCGdex catalog could not be reached. Try again in a moment.", response.status);
  }

  return (await response.json()) as T;
}
