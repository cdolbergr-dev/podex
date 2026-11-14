import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { cardOfTheDayCaption, latestPostTime, publishImage } from "@/lib/instagram";
import { siteUrl } from "@/lib/site";
import { cardOfTheDayDate, cardOfTheDayDaysToPost, getCardOfTheDay } from "@/lib/tcg/collections";

/** Publishes one day's card as a feed post, then as a story. A failed story doesn't undo the post. */
async function postDay(userId: string, token: string, day: string) {
  const featured = await getCardOfTheDay(day);
  if (!featured) throw new Error(`No card of the day for ${day}`);

  const imageUrl = `${siteUrl}/api/instagram/card-of-the-day?day=${day}`;
  const postId = await publishImage(userId, token, imageUrl, { caption: cardOfTheDayCaption(featured) });
  const story = await publishImage(userId, token, `${imageUrl}&format=story`, { media_type: "STORIES" })
    .then((storyId) => ({ storyId }))
    .catch((error: unknown) => {
      const storyError = error instanceof Error ? error.message : String(error);
      console.error(`instagram cron (story ${day}): ${storyError}`);
      return { storyError };
    });
  return { postId, ...story, card: featured.card.id };
}

/**
 * Daily Vercel Schedule "instagram" (vercel.json, GET): posts the card of the day to Instagram,
 * as a feed post and then a story that names the card's page on the site.
 * Needs INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN (from the Meta app's Unified login setup; see
 * instagram/README.md). Skips if the account already posted today (Danish time), so a repeated
 * delivery or a manual post doesn't lead to a double post, and catches up yesterday's card if
 * that day was missed.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = process.env.INSTAGRAM_USER_ID?.trim();
  const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  if (!userId || !token) {
    return NextResponse.json({ ok: true, skipped: "INSTAGRAM_USER_ID / INSTAGRAM_ACCESS_TOKEN not set" });
  }
  if (!siteUrl.startsWith("https://")) {
    return NextResponse.json({ ok: true, skipped: "Instagram can't fetch the image from a local site" });
  }

  try {
    const last = await latestPostTime(userId, token);
    const days = cardOfTheDayDaysToPost(last ? cardOfTheDayDate(last) : null);
    if (days.length === 0) return NextResponse.json({ ok: true, skipped: "already posted today" });

    const posted = [];
    for (const day of days) posted.push({ day, ...(await postDay(userId, token, day)) });
    return NextResponse.json({ ok: true, posted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`instagram cron: ${message}`); // shows up in the run's Vercel logs
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
