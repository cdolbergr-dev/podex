import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { cardOfTheDayCaption, latestPostTime, publishImage, refreshToken } from "@/lib/instagram";
import { siteUrl } from "@/lib/site";
import { cardOfTheDayDate, getCardOfTheDay } from "@/lib/tcg/collections";

/**
 * Daily Vercel Schedule "instagram" (vercel.json, GET): posts the card of the day to Instagram.
 * Needs INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN (a long-lived Instagram Login token, renewed
 * on every run). Skips if the account already posted in the last 20 hours, so a repeated
 * delivery or a manual post doesn't lead to a double post.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  const storedToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!userId || !storedToken) {
    return NextResponse.json({ ok: true, skipped: "INSTAGRAM_USER_ID / INSTAGRAM_ACCESS_TOKEN not set" });
  }
  if (!siteUrl.startsWith("https://")) {
    return NextResponse.json({ ok: true, skipped: "Instagram can't fetch the image from a local site" });
  }

  const refresh = await refreshToken(storedToken);
  const token = refresh.token;
  const report = { ...refresh, token: undefined }; // never echo the token
  try {
    const last = await latestPostTime(userId, token);
    if (last && Date.now() - last.getTime() < 20 * 3_600_000) {
      return NextResponse.json({ ok: true, skipped: "already posted today", refresh: report });
    }

    const featured = await getCardOfTheDay();
    if (!featured) return NextResponse.json({ ok: false, error: "No card of the day" }, { status: 503 });

    const imageUrl = `${siteUrl}/api/instagram/card-of-the-day?day=${cardOfTheDayDate()}`;
    const postId = await publishImage(userId, token, imageUrl, cardOfTheDayCaption(featured));
    return NextResponse.json({ ok: true, postId, card: featured.card.id, refresh: report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), refresh: report },
      { status: 502 },
    );
  }
}
