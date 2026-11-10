/**
 * IndexNow (https://www.indexnow.org): tells Bing, Yandex and other participating search engines
 * which pages changed, so they recrawl them soon. Bing's index also feeds ChatGPT search and
 * Copilot. The key is public by design: search engines verify it at /{key}.txt (in public/).
 */
export const INDEXNOW_KEY = "c665f62133fecf6d9fe85013c1ca8acd";

const MAX_URLS = 10_000;

export async function submitToIndexNow(siteUrl: string, urls: string[]): Promise<{ status: number; submitted: number }> {
  const urlList = [...new Set(urls)].slice(0, MAX_URLS);
  if (urlList.length === 0) return { status: 204, submitted: 0 };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteUrl).host,
      key: INDEXNOW_KEY,
      keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, submitted: urlList.length };
}
