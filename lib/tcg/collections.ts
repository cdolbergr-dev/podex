import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { fetchPokemonSpecies, type PokemonSpecies } from "@/lib/pokeapi";
import { getDataMode } from "@/lib/tcg/config";
import {
  CatalogIndex,
  type ArtistHistory,
  type ArtistSummary,
  type PokemonCardHistory,
  type PokemonSummary,
} from "@/lib/tcg/catalog-index";
import { CATALOG_CACHE_TAG, loadAllCards } from "@/lib/tcg/service";
import type { Card, DataMode } from "@/types/catalog";

let built: { source: Card[]; index: CatalogIndex } | null = null;

/** The Pokémon/artist index of the current catalog, rebuilt when the catalog changes. */
async function catalogIndex(mode: DataMode): Promise<CatalogIndex> {
  const cards = await loadAllCards(mode);
  if (built?.source !== cards) built = { source: cards, index: new CatalogIndex(cards) };
  return built.index;
}

export type PokemonPage = {
  pokemon: PokemonSummary;
  cards: Card[];
  history: PokemonCardHistory;
  /** Links for the evolution line, where those Pokémon have pages. */
  evolvesFrom?: PokemonSummary | { name: string };
  evolvesTo: (PokemonSummary | { name: string })[];
  species: PokemonSpecies | null;
};

export type ArtistPage = { artist: ArtistSummary; cards: Card[]; history: ArtistHistory };

export type CardOfTheDay = {
  card: Card;
  pokemon: PokemonSummary;
  history: PokemonCardHistory;
  species: PokemonSpecies | null;
};

async function cachedSpecies(dex: number): Promise<PokemonSpecies | null> {
  "use cache";
  cacheLife("weeks");
  return fetchPokemonSpecies(dex);
}

async function cachedPokemonIndex(mode: DataMode): Promise<PokemonSummary[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  return (await catalogIndex(mode)).pokemon;
}

async function cachedPokemonPage(mode: DataMode, slug: string): Promise<PokemonPage | null> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  const index = await catalogIndex(mode);
  const pokemon = index.pokemonBySlug(slug);
  if (!pokemon) return null;
  const history = index.history(pokemon.dex);
  const link = (name: string) => index.pokemonByName(name) ?? { name };
  return {
    pokemon,
    cards: index.cardsForDex(pokemon.dex),
    history,
    evolvesFrom: history.evolvesFrom ? link(history.evolvesFrom) : undefined,
    evolvesTo: history.evolvesTo.map(link),
    species: await cachedSpecies(pokemon.dex),
  };
}

async function cachedArtistIndex(mode: DataMode): Promise<ArtistSummary[]> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  return (await catalogIndex(mode)).artists;
}

async function cachedArtistPage(mode: DataMode, slug: string): Promise<ArtistPage | null> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  const index = await catalogIndex(mode);
  const artist = index.artistBySlugName(slug);
  return artist ? { artist, cards: index.cardsForArtist(slug), history: index.artistHistory(slug) } : null;
}

async function cachedPokemonSlug(mode: DataMode, dex: number): Promise<string | null> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("days");
  return (await catalogIndex(mode)).pokemonByDex(dex)?.slug ?? null;
}

/** Small, stable hash so every visitor gets the same card on a given day. */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

const FEATURED_RARITY = /rare|holo|ultra|secret|illustration|special|shiny|amazing|radiant|ace/i;

async function cachedCardOfTheDay(mode: DataMode, day: string): Promise<CardOfTheDay | null> {
  "use cache";
  cacheTag(CATALOG_CACHE_TAG);
  cacheLife("hours");
  const index = await catalogIndex(mode);
  // A single-species Pokémon card with art, preferring rarer printings.
  const candidates = index.pokemon
    .flatMap((entry) => index.cardsForDex(entry.dex))
    .filter(
      (card) =>
        card.nationalPokedexNumbers?.length === 1 &&
        card.images.large &&
        card.rarity &&
        FEATURED_RARITY.test(card.rarity),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  if (candidates.length === 0) return null;
  const card = candidates[hash(day) % candidates.length];
  const pokemon = index.pokemonByDex(card.nationalPokedexNumbers![0]);
  if (!pokemon) return null;
  return { card, pokemon, history: index.history(pokemon.dex), species: await cachedSpecies(pokemon.dex) };
}

export async function getPokemonIndex(): Promise<PokemonSummary[]> {
  await connection();
  return cachedPokemonIndex(getDataMode());
}

export async function getPokemonPage(slug: string): Promise<PokemonPage | null> {
  await connection();
  return cachedPokemonPage(getDataMode(), slug);
}

export async function getArtistIndex(): Promise<ArtistSummary[]> {
  await connection();
  return cachedArtistIndex(getDataMode());
}

export async function getArtistPage(slug: string): Promise<ArtistPage | null> {
  await connection();
  return cachedArtistPage(getDataMode(), slug);
}

/** For /pokemon/25 → /pokemon/pikachu (card pages link by Pokédex number). */
export async function getPokemonSlugByDex(dex: number): Promise<string | null> {
  await connection();
  return cachedPokemonSlug(getDataMode(), dex);
}

/** The card of the day's date, "YYYY-MM-DD" in Danish time. */
export function cardOfTheDayDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(now);
}

/** Today's featured card; the day turns over at midnight Danish time. */
export async function getCardOfTheDay(): Promise<CardOfTheDay | null> {
  await connection();
  return cachedCardOfTheDay(getDataMode(), cardOfTheDayDate());
}

/** For the sitemap: no request-time APIs, so it can be prerendered. */
export async function getSitemapCollections(): Promise<{ pokemon: string[]; artists: string[] }> {
  const mode = getDataMode();
  const [pokemon, artists] = await Promise.all([cachedPokemonIndex(mode), cachedArtistIndex(mode)]);
  return { pokemon: pokemon.map((entry) => entry.slug), artists: artists.map((artist) => artist.slug) };
}
