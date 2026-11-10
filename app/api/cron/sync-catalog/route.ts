import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { hasDatabaseConfig } from "@/lib/db/client";
import { CATALOG_CACHE_TAG } from "@/lib/tcg/service";
import { syncCatalogFromApi } from "@/lib/tcg/sync";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasDatabaseConfig()) {
    return NextResponse.json({ error: "MySQL is not configured" }, { status: 503 });
  }

  try {
    const result = await syncCatalogFromApi();
    // Serve the old catalog to the next visitor while fresh data loads, then the new one.
    revalidateTag(CATALOG_CACHE_TAG, "max");
    return NextResponse.json({
      ok: true,
      cardCount: result.cardCount,
      setCount: result.setCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
