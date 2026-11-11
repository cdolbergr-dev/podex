import { renderCardOfTheDayPost } from "@/lib/instagram";
import { getCardOfTheDay } from "@/lib/tcg/collections";

/**
 * Today's card of the day as a 1080×1350 JPEG for Instagram. Public, because Instagram fetches it
 * when the daily post is created (app/api/cron/instagram). The "?day=" query the cron adds only
 * keeps caches from serving yesterday's image.
 */
export async function GET() {
  const featured = await getCardOfTheDay().catch(() => null);
  if (!featured) return new Response("No card of the day", { status: 404 });

  const jpeg = await renderCardOfTheDayPost(featured);
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
