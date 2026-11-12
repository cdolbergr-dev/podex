import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { cardOfTheDayCaption, latestPostTime, publishImage } from "@/lib/instagram";
import { siteUrl } from "@/lib/site";
import { cardOfTheDayDate, getCardOfTheDay } from "@/lib/tcg/collections";

/**
 * Daily Vercel Schedule "instagram" (vercel.json, GET): posts the card of the day to Instagram,
 * as a feed post and then a story that names the card's page on the site.
 * Needs INSTAGRAM_USER_ID and INSTAGRAM_ACCESS_TOKEN (from the Meta app's Unified login setup; see
 * instagram/README.md). Skips if the account already posted in the last 20 hours, so a repeated
 * delivery or a manual post doesn't lead to a double post.
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
    if (last && Date.now() - last.getTime() < 20 * 3_600_000) {
      return NextResponse.json({ ok: true, skipped: "already posted today" });
    }

    const featured = await getCardOfTheDay();
    if (!featured) return NextResponse.json({ ok: false, error: "No card of the day" }, { status: 503 });

    const imageUrl = `${siteUrl}/api/instagram/card-of-the-day?day=${cardOfTheDayDate()}`;
    const postId = await publishImage(userId, token, imageUrl, { caption: cardOfTheDayCaption(featured) });

    // The story follows the post. If it fails, the post still stands and the error is reported.
    const story = await publishImage(userId, token, `${imageUrl}&format=story`, { media_type: "STORIES" })
      .then((storyId) => ({ storyId }))
      .catch((error: unknown) => {
        const storyError = error instanceof Error ? error.message : String(error);
        console.error(`instagram cron (story): ${storyError}`);
        return { storyError };
      });
    return NextResponse.json({ ok: true, postId, ...story, card: featured.card.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`instagram cron: ${message}`); // shows up in the run's Vercel logs
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
