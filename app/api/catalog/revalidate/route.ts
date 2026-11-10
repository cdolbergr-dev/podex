import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { CATALOG_CACHE_TAG } from "@/lib/tcg/service";

/**
 * Marks every cached catalog read stale. Called by `npm run sync-catalog`, which runs outside
 * the server process and so can't clear the server's cache itself.
 */
export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(CATALOG_CACHE_TAG, "max");
  return NextResponse.json({ ok: true });
}
