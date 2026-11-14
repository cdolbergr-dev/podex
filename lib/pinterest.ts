import { brand } from "@/lib/brand";
import { readGlobalConfigItem, writeGlobalConfigItem } from "@/lib/global-config";
import { dexLabel } from "@/lib/generations";
import { siteUrl } from "@/lib/site";
import type { CardOfTheDay } from "@/lib/tcg/collections";

/**
 * Pinterest API v5 (pinterest/README.md has the setup). Access tokens last 30 days; refresh
 * tokens last 60 days and are replaced on every refresh ("continuous refresh"), so the current
 * pair lives in Vercel Global Config, together with the last day a pin was posted.
 *
 * Apps with Trial access may only create pins in Pinterest's API Sandbox, with a separate sandbox
 * token (PINTEREST_SANDBOX_TOKEN). Pins there are visible only to the account owner, which is
 * enough to show the integration when requesting Standard access.
 */
export const API = "https://api.pinterest.com/v5";
export const SANDBOX_API = "https://api-sandbox.pinterest.com/v5";

/** The board the daily pin goes to; created in the sandbox when it doesn't exist there yet. */
const BOARD_NAME = "Pokémon Card of the Day";
const BOARD_DESCRIPTION = "A new Pokémon card every day, from every set ever printed.";

/** Global Config key holding PinterestState. */
const STATE_KEY = "pinterest";

/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_MS = 3 * 24 * 3_600_000;

export type PinterestState = {
  accessToken?: string;
  /** ISO time the access token expires. */
  accessExpiresAt?: string;
  refreshToken: string;
  refreshExpiresAt?: string;
  /** Danish date ("YYYY-MM-DD") of the last card of the day that was pinned. */
  lastDay?: string;
  /** The same for the sandbox, so test pins don't hold back the first real one. */
  sandboxLastDay?: string;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

type ApiError = { code?: number; message?: string };

function basicAuth(): string {
  const appId = process.env.PINTEREST_APP_ID?.trim();
  const secret = process.env.PINTEREST_APP_SECRET?.trim();
  if (!appId || !secret) throw new Error("PINTEREST_APP_ID / PINTEREST_APP_SECRET is not set");
  return `Basic ${Buffer.from(`${appId}:${secret}`).toString("base64")}`;
}

/** Exchanges an authorization code or a refresh token at Pinterest's token endpoint. */
export async function requestPinterestToken(fields: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse & ApiError;
  if (!response.ok) throw new Error(`Pinterest token: ${body.message ?? response.status}${body.code ? ` (code ${body.code})` : ""}`);
  return body;
}

/** The state after a token response: a new refresh token replaces the old one when Pinterest sends one. */
export function stateFromToken(token: TokenResponse, previous?: PinterestState): PinterestState {
  const now = Date.now();
  return {
    ...previous,
    accessToken: token.access_token,
    accessExpiresAt: new Date(now + token.expires_in * 1000).toISOString(),
    refreshToken: token.refresh_token ?? previous?.refreshToken ?? "",
    refreshExpiresAt: token.refresh_token_expires_in
      ? new Date(now + token.refresh_token_expires_in * 1000).toISOString()
      : previous?.refreshExpiresAt,
  };
}

export async function readPinterestState(): Promise<PinterestState | null> {
  return readGlobalConfigItem<PinterestState>(STATE_KEY);
}

export async function savePinterestState(state: PinterestState): Promise<void> {
  await writeGlobalConfigItem(STATE_KEY, state);
}

/**
 * A usable access token, refreshing (and saving the new pair) when it's close to expiring.
 * Daily runs refresh about once a month, well inside the refresh token's 60 days.
 */
export async function ensureAccessToken(state: PinterestState): Promise<PinterestState> {
  const expiresAt = state.accessExpiresAt ? Date.parse(state.accessExpiresAt) : 0;
  if (state.accessToken && expiresAt - Date.now() > REFRESH_MARGIN_MS) return state;

  const token = await requestPinterestToken({
    grant_type: "refresh_token",
    refresh_token: state.refreshToken,
    continuous_refresh: "true",
  });
  const next = stateFromToken(token, state);
  await savePinterestState(next);
  return next;
}

async function api<T>(token: string, path: string, init?: RequestInit, base = API): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) {
    throw new Error(`Pinterest${base === SANDBOX_API ? " sandbox" : ""} ${path.split("?")[0]}: ${body.message ?? response.status}${body.code ? ` (code ${body.code})` : ""}`);
  }
  return body;
}

export async function listPinterestBoards(token: string, base = API): Promise<{ id: string; name: string }[]> {
  const { items } = await api<{ items: { id: string; name: string }[] }>(token, "/boards?page_size=100", undefined, base);
  return items;
}

/** The sandbox copy of the daily board (the sandbox has its own boards), created on first use. */
export async function sandboxBoardId(token: string): Promise<string> {
  const existing = (await listPinterestBoards(token, SANDBOX_API)).find((board) => board.name === BOARD_NAME);
  if (existing) return existing.id;
  const created = await api<{ id: string }>(
    token,
    "/boards",
    { method: "POST", body: JSON.stringify({ name: BOARD_NAME, description: BOARD_DESCRIPTION }) },
    SANDBOX_API,
  );
  return created.id;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** The pin for one day's card: title, description and alt text within Pinterest's limits, linking to the card's page. */
export function cardOfTheDayPin({ card, pokemon, history, species }: CardOfTheDay) {
  const firstYear = history.first?.releaseDate?.match(/^\d{4}/)?.[0];
  const description = [
    `${card.name} from ${card.set.name}${card.rarity ? ` (${card.rarity})` : ""}, the ${brand.name} card of the day.`,
    [dexLabel(pokemon.dex), species?.en.genus].filter(Boolean).join(" · ") || null,
    species?.en.entry ? `“${species.en.entry}”` : null,
    history.first ? `First on a card: ${history.first.setName}${firstYear ? ` (${firstYear})` : ""}.` : null,
    `See all ${history.cardCount} ${pokemon.name} cards, with prices, on ${brand.name}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    title: truncate(`${card.name} · ${card.set.name} Pokémon card`, 100),
    description: truncate(description, 800),
    alt_text: truncate(`${card.name} Pokémon card from ${card.set.name}`, 500),
    link: `${siteUrl}/cards/${encodeURIComponent(card.id)}`,
  };
}

/** Creates a pin from a public image URL on the given board (in the sandbox when base is SANDBOX_API). */
export async function createPin(
  token: string,
  pin: { boardId: string; imageUrl: string; title: string; description: string; alt_text: string; link: string },
  base = API,
): Promise<string> {
  const { boardId, imageUrl, ...text } = pin;
  const created = await api<{ id: string }>(
    token,
    "/pins",
    {
      method: "POST",
      body: JSON.stringify({ board_id: boardId, media_source: { source_type: "image_url", url: imageUrl }, ...text }),
    },
    base,
  );
  return created.id;
}
