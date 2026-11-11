import { ImageResponse } from "next/og";
import sharp from "sharp";
import { brand } from "@/lib/brand";
import { cardNumberLabel } from "@/lib/format";
import { dexLabel, generationOf, romanNumeral } from "@/lib/generations";
import { ogColors, ogImageUrl } from "@/lib/og";
import { siteUrl } from "@/lib/site";
import type { CardOfTheDay } from "@/lib/tcg/collections";

/** Instagram API with Instagram Login (no Facebook Page needed). */
const GRAPH = "https://graph.instagram.com/v24.0";

/** Instagram's portrait feed size. */
export const POST_SIZE = { width: 1080, height: 1350 };

const siteHost = siteUrl.replace(/^https?:\/\//, "");

/** Today's post image. Instagram only publishes JPEGs, so the PNG from next/og is converted. */
export async function renderCardOfTheDayPost({ card }: CardOfTheDay): Promise<Buffer> {
  const art = ogImageUrl(card.images.large || card.images.small);
  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "56px 80px 52px",
          background: ogColors.background,
          color: ogColors.foreground,
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: 32, color: ogColors.muted }}>
          <div>{brand.name}</div>
          <div>Card of the day</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
        <img
          src={art}
          alt=""
          width={600}
          height={838}
          style={{ marginTop: 44, borderRadius: 26, boxShadow: "0 40px 70px -35px rgba(28,25,23,0.6)" }}
        />
        <div
          style={{
            marginTop: 44,
            fontSize: card.name.length > 22 ? 52 : 66,
            fontWeight: 600,
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          {card.name}
        </div>
        <div style={{ marginTop: 14, fontSize: 32, color: ogColors.muted, textAlign: "center" }}>
          {[card.set.name, cardNumberLabel(card), card.rarity].filter(Boolean).join(" · ")}
        </div>
        <div style={{ marginTop: "auto", fontSize: 30, color: ogColors.muted }}>{siteHost}</div>
      </div>
    ),
    POST_SIZE,
  );
  return sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

function hashtag(text: string): string {
  return `#${text.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
}

/** The post text: the card, its Pokémon's Pokédex entry, its first card and hashtags. */
export function cardOfTheDayCaption({ card, pokemon, history, species }: CardOfTheDay): string {
  const generation = species?.generation ?? generationOf(pokemon.dex);
  const subtitle = [dexLabel(pokemon.dex), species?.en.genus, generation <= 9 ? `Generation ${romanNumeral(generation)}` : null]
    .filter(Boolean)
    .join(" · ");
  const entry = species?.en.entry;
  const firstYear = history.first?.releaseDate?.match(/^\d{4}/)?.[0];
  const tags = [...new Set(["#pokemon", "#pokemontcg", "#pokemoncards", "#cardoftheday", hashtag(pokemon.name), hashtag(card.set.name), hashtag(brand.name)])];

  return [
    `Card of the day: ${card.name}`,
    [card.set.name, card.rarity].filter(Boolean).join(" · "),
    "",
    subtitle,
    entry ? `“${entry}”` : null,
    history.first ? `First on a card: ${history.first.setName}${firstYear ? ` (${firstYear})` : ""}` : null,
    "",
    `See all ${history.cardCount} ${pokemon.name} cards on ${siteHost} (link in bio).`,
    "",
    tags.join(" "),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

type GraphError = { error?: { message?: string } };

async function graph<T>(path: string, init?: RequestInit, base = GRAPH): Promise<T> {
  const response = await fetch(`${base}${path}`, { ...init, cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as T & GraphError;
  if (!response.ok) throw new Error(`Instagram ${path.split("?")[0]}: ${body.error?.message ?? response.status}`);
  return body;
}

/** When the account last posted, so a repeated schedule delivery doesn't post twice. */
export async function latestPostTime(userId: string, token: string): Promise<Date | null> {
  const { data } = await graph<{ data: { timestamp: string }[] }>(
    `/${userId}/media?fields=timestamp&limit=1&access_token=${encodeURIComponent(token)}`,
  );
  return data[0] ? new Date(data[0].timestamp) : null;
}

/** Creates a media container from a public JPEG URL, waits for Instagram to fetch it, publishes it. */
export async function publishImage(userId: string, token: string, imageUrl: string, caption: string): Promise<string> {
  const form = (fields: Record<string, string>) =>
    ({ method: "POST", body: new URLSearchParams({ ...fields, access_token: token }) }) satisfies RequestInit;

  const container = await graph<{ id: string }>(`/${userId}/media`, form({ image_url: imageUrl, caption }));
  for (let attempt = 0; attempt < 10; attempt++) {
    const { status_code } = await graph<{ status_code?: string }>(
      `/${container.id}?fields=status_code&access_token=${encodeURIComponent(token)}`,
    );
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`Instagram container ${status_code}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  const post = await graph<{ id: string }>(`/${userId}/media_publish`, form({ creation_id: container.id }));
  return post.id;
}

/**
 * Long-lived tokens last 60 days; refreshing one (allowed once it is a day old) starts a new 60
 * days. If Instagram hands back a different token, it is saved to the Vercel project so the next
 * deployment (the daily catalog rebuild) uses it. Returns the token to use for this run.
 */
export async function refreshToken(token: string): Promise<{ token: string; expiresInDays?: number; saved?: boolean; error?: string }> {
  try {
    const refreshed = await graph<{ access_token: string; expires_in: number }>(
      `/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`,
      undefined,
      "https://graph.instagram.com",
    );
    const expiresInDays = Math.round(refreshed.expires_in / 86_400);
    if (refreshed.access_token === token) return { token, expiresInDays };
    return { token: refreshed.access_token, expiresInDays, saved: await saveTokenToVercel(refreshed.access_token) };
  } catch (error) {
    // Too soon after the last refresh, or already expired; posting will tell which.
    return { token, error: error instanceof Error ? error.message : String(error) };
  }
}

async function saveTokenToVercel(token: string): Promise<boolean> {
  const apiToken = process.env.VERCEL_API_TOKEN?.trim();
  const project = process.env.VERCEL_PROJECT_ID?.trim();
  if (!apiToken || !project) return false;
  const team = process.env.VERCEL_TEAM_ID?.trim();
  const response = await fetch(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/env?upsert=true${team ? `&teamId=${encodeURIComponent(team)}` : ""}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ key: "INSTAGRAM_ACCESS_TOKEN", value: token, type: "encrypted", target: ["production"] }),
    },
  );
  return response.ok;
}
