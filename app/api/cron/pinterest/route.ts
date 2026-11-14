import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { hasGlobalConfig } from "@/lib/global-config";
import {
  cardOfTheDayPin,
  createPin,
  ensureAccessToken,
  readPinterestState,
  savePinterestState,
  type PinterestState,
} from "@/lib/pinterest";
import { siteUrl } from "@/lib/site";
import { cardOfTheDayDaysToPost, getCardOfTheDay } from "@/lib/tcg/collections";

/**
 * Daily Vercel Schedule "pinterest" (vercel.json, GET): pins the card of the day to the Podex
 * board, linking to the card's page. Needs PINTEREST_APP_ID, PINTEREST_APP_SECRET,
 * PINTEREST_BOARD_ID and a Global Config store (GLOBAL_CONFIG, VERCEL_API_TOKEN) holding the tokens
 * from `npm run pinterest:connect` (see pinterest/README.md). The last pinned day is kept there
 * too, so a repeated delivery doesn't pin twice, and a missed day is caught up once.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const boardId = process.env.PINTEREST_BOARD_ID?.trim();
  if (!boardId || !process.env.PINTEREST_APP_ID?.trim() || !hasGlobalConfig()) {
    return NextResponse.json({ ok: true, skipped: "Pinterest or Global Config is not configured" });
  }
  if (!siteUrl.startsWith("https://")) {
    return NextResponse.json({ ok: true, skipped: "Pinterest can't fetch the image from a local site" });
  }

  let state: PinterestState | null = null;
  let pinned = false;
  const posted = [];
  try {
    state = await readPinterestState();
    if (!state?.refreshToken) return NextResponse.json({ ok: true, skipped: "not connected (npm run pinterest:connect)" });
    state = await ensureAccessToken(state);

    for (const day of cardOfTheDayDaysToPost(state.lastDay ?? null)) {
      const featured = await getCardOfTheDay(day);
      if (!featured) throw new Error(`No card of the day for ${day}`);
      const pinId = await createPin(state.accessToken!, {
        boardId,
        imageUrl: `${siteUrl}/api/instagram/card-of-the-day?day=${day}&format=pin`,
        ...cardOfTheDayPin(featured),
      });
      state = { ...state, lastDay: day };
      pinned = true;
      posted.push({ day, pinId, card: featured.card.id });
    }
    if (posted.length === 0) return NextResponse.json({ ok: true, skipped: "already pinned today" });
    return NextResponse.json({ ok: true, posted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`pinterest cron: ${message}`); // shows up in the run's Vercel logs
    return NextResponse.json({ ok: false, error: message, posted }, { status: 502 });
  } finally {
    // Record the last pinned day even when a later step failed, so it isn't pinned again.
    if (pinned && state) {
      await savePinterestState(state).catch((error: unknown) => {
        console.error(`pinterest cron (saving state): ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  }
}
