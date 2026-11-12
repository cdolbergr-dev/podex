import { ImageResponse } from "next/og";
import sharp from "sharp";
import { brand } from "@/lib/brand";
import { cardNumberLabel } from "@/lib/format";
import { dexLabel, generationOf, romanNumeral } from "@/lib/generations";
import { ogColors, ogImageUrl } from "@/lib/og";
import { siteUrl } from "@/lib/site";
import type { CardOfTheDay } from "@/lib/tcg/collections";

/**
 * Instagram API with Unified Login (no Facebook Page needed). The token is a system-user token
 * from the app's Unified login configuration, so it lasts as long as that configuration says.
 */
const GRAPH = "https://graph.facebook.com/v27.0";

/** Feed posts are 4:5; stories are 9:16 and keep clear of Instagram's top bar and reply field. */
const FORMATS = {
  post: { width: 1080, height: 1350, padding: "56px 80px 52px", card: 600, label: 32, name: 66, gap: 44 },
  story: { width: 1080, height: 1920, padding: "250px 80px 230px", card: 680, label: 40, name: 76, gap: 54 },
} as const;

export type ImageFormat = keyof typeof FORMATS;

const siteHost = siteUrl.replace(/^https?:\/\//, "");

/** The card's page, as printed on the story (API stories can't carry link stickers). */
export function cardPageLabel(cardId: string): string {
  return `${siteHost}/cards/${cardId}`;
}

/** Today's post or story image. Instagram only publishes JPEGs, so the PNG from next/og is converted. */
export async function renderCardOfTheDay({ card }: CardOfTheDay, format: ImageFormat): Promise<Buffer> {
  const f = FORMATS[format];
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
          padding: f.padding,
          background: ogColors.background,
          color: ogColors.foreground,
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", fontSize: f.label, color: ogColors.muted }}>
          <div>{brand.name}</div>
          <div>Card of the day</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- rendered by next/og, not the browser */}
        <img
          src={art}
          alt=""
          width={f.card}
          height={Math.round((f.card * 88) / 63)}
          style={{ marginTop: f.gap, borderRadius: 26, boxShadow: "0 40px 70px -35px rgba(28,25,23,0.6)" }}
        />
        <div
          style={{
            marginTop: f.gap,
            fontSize: card.name.length > 22 ? Math.round(f.name * 0.8) : f.name,
            fontWeight: 600,
            lineHeight: 1.05,
            textAlign: "center",
          }}
        >
          {card.name}
        </div>
        <div style={{ marginTop: 14, fontSize: f.label, color: ogColors.muted, textAlign: "center" }}>
          {[card.set.name, cardNumberLabel(card), card.rarity].filter(Boolean).join(" · ")}
        </div>
        {format === "story" ? (
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 34, color: ogColors.muted }}>See the card on</div>
            <div style={{ marginTop: 10, fontSize: 42, fontWeight: 600 }}>{cardPageLabel(card.id)}</div>
          </div>
        ) : (
          <div style={{ marginTop: "auto", fontSize: 30, color: ogColors.muted }}>{siteHost}</div>
        )}
      </div>
    ),
    { width: f.width, height: f.height },
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

async function graph<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GRAPH}${path}`, { ...init, cache: "no-store" });
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

/**
 * Creates a media container from a public JPEG URL, waits for Instagram to fetch it, publishes it.
 * A feed post takes a caption; a story is { media_type: "STORIES" } and has no caption.
 */
export async function publishImage(
  userId: string,
  token: string,
  imageUrl: string,
  options: { caption: string } | { media_type: "STORIES" },
): Promise<string> {
  const form = (fields: Record<string, string>) =>
    ({ method: "POST", body: new URLSearchParams({ ...fields, access_token: token }) }) satisfies RequestInit;

  const container = await graph<{ id: string }>(`/${userId}/media`, form({ image_url: imageUrl, ...options }));
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
