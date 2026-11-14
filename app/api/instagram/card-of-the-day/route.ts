import { renderCardOfTheDay } from "@/lib/instagram";
import { getCardOfTheDay } from "@/lib/tcg/collections";

/**
 * Today's card of the day as a JPEG for Instagram: the 1080×1350 feed post, or with
 * "?format=story" the 1080×1920 story, or with "?format=pin" the 1000×1500 Pinterest pin. Public,
 * because Instagram and Pinterest fetch it when the daily post is created (app/api/cron/instagram,
 * app/api/cron/pinterest). "?day=YYYY-MM-DD" picks the day (default today; the
 * cron always passes it, which also keeps caches from serving another day's image).
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const featured = await getCardOfTheDay(query.get("day") ?? undefined).catch(() => null);
  if (!featured) return new Response("No card of the day", { status: 404 });

  const requested = query.get("format");
  const format = requested === "story" || requested === "pin" ? requested : "post";
  const jpeg = await renderCardOfTheDay(featured, format);
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=600, s-maxage=600" },
  });
}
