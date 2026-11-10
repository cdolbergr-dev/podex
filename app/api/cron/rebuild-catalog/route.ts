import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";

/**
 * Daily Vercel Schedule "rebuild-catalog" (vercel.json, GET): triggers a fresh production build
 * through a deploy hook. The build downloads the latest TCGdex catalog
 * (scripts/build-catalog.ts), so the static catalog stays current without a database. Vercel
 * sends CRON_SECRET as a bearer token. A rare duplicate delivery only queues an extra rebuild.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  if (!hook) {
    return NextResponse.json({ error: "VERCEL_DEPLOY_HOOK_URL is not set" }, { status: 503 });
  }

  const response = await fetch(hook, { method: "POST" });
  if (!response.ok) {
    return NextResponse.json({ ok: false, status: response.status }, { status: 502 });
  }
  return NextResponse.json({ ok: true, triggered: "rebuild" });
}
