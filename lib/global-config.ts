/**
 * Vercel Global Config (formerly Edge Config) as a tiny free key-value store for state a job must
 * keep between runs (production has no database). Reads use the store's connection string
 * (GLOBAL_CONFIG, added when the store is connected to the project; EDGE_CONFIG from before the
 * rename also works); writes go through the Vercel API with PODEX_VERCEL_TOKEN (plus
 * PODEX_VERCEL_TEAM_ID when the store belongs to a team). The older names VERCEL_API_TOKEN and
 * VERCEL_TEAM_ID are read as a fallback; the PODEX_ names can't collide with anything Vercel sets
 * itself. The free plan allows 250 writes a month, so only write when something changed.
 */

function setting(...names: string[]): { name: string; value: string } | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

const apiToken = () => setting("PODEX_VERCEL_TOKEN", "VERCEL_API_TOKEN");
const teamId = () => setting("PODEX_VERCEL_TEAM_ID", "VERCEL_TEAM_ID");

/** Which variable a value came from, with its length and last 4 characters: enough to compare, not to use. */
function fingerprint(entry: { name: string; value: string } | null): string {
  return entry ? `${entry.name} (${entry.value.length} chars, …${entry.value.slice(-4)})` : "not set";
}

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
  return connection() !== null && apiToken() !== null;
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
  const token = apiToken();
  const team = teamId();
  if (!store || !token) throw new Error("GLOBAL_CONFIG / PODEX_VERCEL_TOKEN is not set");
  const response = await fetch(
    `https://api.vercel.com/v1/global-config/${store.id}/items${team ? `?teamId=${encodeURIComponent(team.value)}` : ""}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Global Config write ${key}: ${response.status} ${body.slice(0, 200)} ` +
        `[token: ${fingerprint(token)}; team: ${fingerprint(team)}; store: …${store.id.slice(-4)}]`,
    );
  }
}
