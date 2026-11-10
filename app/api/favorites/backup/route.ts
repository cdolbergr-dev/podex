import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Safety copy of a visitor's favorite lists, kept in cookies set by this server.
 *
 * Safari deletes storage written by page scripts (localStorage, document.cookie) for sites
 * not visited in 7 days; cookies set via Set-Cookie by the site's own server aren't capped.
 * The client posts its encoded lists here after changes and reads them back if its
 * localStorage was wiped. The server never parses or keeps the data — it only splits the
 * opaque string into cookies scoped to this path (so they aren't sent with other requests).
 */

const COOKIE_PREFIX = "podex_fav_";
const PATH = "/api/favorites";
const CHUNK_SIZE = 3800;
const MAX_CHUNKS = 12;
const MAX_AGE = 400 * 24 * 60 * 60; // Chrome's ceiling for cookie lifetimes.
const ENCODED = /^[zj][A-Za-z0-9_-]+$/;

function chunkIndex(name: string): number | null {
  if (!name.startsWith(COOKIE_PREFIX)) return null;
  const index = Number(name.slice(COOKIE_PREFIX.length));
  return Number.isInteger(index) && index >= 0 && index < MAX_CHUNKS ? index : null;
}

export async function GET() {
  const store = await cookies();
  const chunks = new Map<number, string>();
  for (const cookie of store.getAll()) {
    const index = chunkIndex(cookie.name);
    if (index !== null) chunks.set(index, cookie.value);
  }

  let data = "";
  for (let i = 0; chunks.has(i); i++) data += chunks.get(i);
  if (!data || !ENCODED.test(data)) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { data?: unknown } | null;
  const data = typeof body?.data === "string" ? body.data : "";
  if (!ENCODED.test(data)) return NextResponse.json({ error: "Invalid backup" }, { status: 400 });
  if (data.length > CHUNK_SIZE * MAX_CHUNKS) return NextResponse.json({ error: "Too large" }, { status: 413 });

  const store = await cookies();
  const options = {
    path: PATH,
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  const count = Math.ceil(data.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    store.set(`${COOKIE_PREFIX}${i}`, data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), options);
  }
  // Drop chunks left over from a longer previous copy.
  for (const cookie of store.getAll()) {
    const index = chunkIndex(cookie.name);
    if (index !== null && index >= count) store.set(cookie.name, "", { ...options, maxAge: 0 });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
