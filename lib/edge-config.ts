/**
 * Vercel Edge Config as a tiny free key-value store for state a job must keep between runs
 * (production has no database). Reads use the store's connection string (EDGE_CONFIG, added when
 * the store is connected to the project); writes go through the Vercel API with VERCEL_API_TOKEN
 * (plus VERCEL_TEAM_ID when the store belongs to a team). Writes are limited on the free plan, so
 * only write when something changed.
 */

function connection(): { id: string; token: string } | null {
  const raw = process.env.EDGE_CONFIG?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const id = url.pathname.replace(/^\//, "");
    const token = url.searchParams.get("token");
    return id && token ? { id, token } : null;
  } catch {
    return null;
  }
}

export function hasEdgeConfig(): boolean {
  return connection() !== null && Boolean(process.env.VERCEL_API_TOKEN?.trim());
}

/** The item's value, or null when it doesn't exist yet. */
export async function readEdgeConfigItem<T>(key: string): Promise<T | null> {
  const store = connection();
  if (!store) throw new Error("EDGE_CONFIG is not set");
  const response = await fetch(
    `https://edge-config.vercel.com/${store.id}/item/${encodeURIComponent(key)}?token=${encodeURIComponent(store.token)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Edge Config read ${key}: ${response.status}`);
  return (await response.json()) as T;
}

export async function writeEdgeConfigItem(key: string, value: unknown): Promise<void> {
  const store = connection();
  const apiToken = process.env.VERCEL_API_TOKEN?.trim();
  if (!store || !apiToken) throw new Error("EDGE_CONFIG / VERCEL_API_TOKEN is not set");
  const team = process.env.VERCEL_TEAM_ID?.trim();
  const response = await fetch(
    `https://api.vercel.com/v1/edge-config/${store.id}/items${team ? `?teamId=${encodeURIComponent(team)}` : ""}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Edge Config write ${key}: ${response.status} ${body.slice(0, 200)}`);
  }
}
