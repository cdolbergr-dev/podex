/**
 * Vercel Global Config (formerly Edge Config) as a tiny free key-value store for state a job must
 * keep between runs (production has no database). Reads use the store's connection string
 * (GLOBAL_CONFIG, added when the store is connected to the project; EDGE_CONFIG from before the
 * rename also works); writes go through the Vercel API with VERCEL_API_TOKEN (plus VERCEL_TEAM_ID
 * when the store belongs to a team). The free plan allows 250 writes a month, so only write when
 * something changed.
 */

function connection(): { url: URL; id: string; token: string } | null {
  const raw = (process.env.GLOBAL_CONFIG || process.env.EDGE_CONFIG)?.trim();
  if (!raw) return null;
  try {
    // https://global-config.vercel.com/<id>?token=<read token> (older stores: edge-config.vercel.com)
    const url = new URL(raw);
    const id = url.pathname.replace(/^\//, "");
    const token = url.searchParams.get("token");
    return id && token ? { url, id, token } : null;
  } catch {
    return null;
  }
}

export function hasGlobalConfig(): boolean {
  return connection() !== null && Boolean(process.env.VERCEL_API_TOKEN?.trim());
}

/** The item's value, or null when it doesn't exist yet. */
export async function readGlobalConfigItem<T>(key: string): Promise<T | null> {
  const store = connection();
  if (!store) throw new Error("GLOBAL_CONFIG is not set");
  const response = await fetch(`${store.url.origin}/${store.id}/item/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${store.token}` },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Global Config read ${key}: ${response.status}`);
  return (await response.json()) as T;
}

export async function writeGlobalConfigItem(key: string, value: unknown): Promise<void> {
  const store = connection();
  const apiToken = process.env.VERCEL_API_TOKEN?.trim();
  if (!store || !apiToken) throw new Error("GLOBAL_CONFIG / VERCEL_API_TOKEN is not set");
  const team = process.env.VERCEL_TEAM_ID?.trim();
  const response = await fetch(
    `https://api.vercel.com/v1/global-config/${store.id}/items${team ? `?teamId=${encodeURIComponent(team)}` : ""}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Global Config write ${key}: ${response.status} ${body.slice(0, 200)}`);
  }
}
