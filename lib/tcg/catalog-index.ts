import { slugify } from "@/lib/slug";
import { sortExploreCards } from "@/lib/tcg/sort-cards";
import type { Card } from "@/types/catalog";

export type PokemonSummary = {
  dex: number;
  name: string;
  slug: string;
  count: number;
  /** Small art of its most recent printing, for index tiles. */
  image: string;
};

export type ArtistSummary = {
  name: string;
  slug: string;
  count: number;
};

/** An artist's span of work and the Pokémon they've drawn most. */
export type ArtistHistory = {
  first?: { setName: string; releaseDate?: string };
  latest?: { setName: string; releaseDate?: string };
  topPokemon: { name: string; slug: string; count: number }[];
};

/** What the catalog itself says about a Pokémon's trading card history. */
export type PokemonCardHistory = {
  cardCount: number;
  setCount: number;
  artistCount: number;
  first?: { cardId: string; setName: string; releaseDate?: string };
  latest?: { cardId: string; setName: string; releaseDate?: string };
  evolvesFrom?: string;
  evolvesTo: string[];
};

/** Unique slugs: a second "Pikachu" would become "pikachu-2" (in input order). */
function assignSlugs<T extends { name: string }>(items: T[]): (T & { slug: string })[] {
  const used = new Map<string, number>();
  return items.map((item) => {
    const base = slugify(item.name) || "unknown";
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return { ...item, slug: seen === 0 ? base : `${base}-${seen + 1}` };
  });
}

/**
 * The species name behind a set of card names (also picks the usual spelling of an artist): the name contained in most of them
 * ("Charizard" in "Charizard ex", "Dark Charizard"…), shortest on ties.
 */
function speciesName(names: string[]): string {
  const unique = [...new Set(names)];
  let best = unique[0] ?? "";
  let bestScore = -1;
  for (const candidate of unique) {
    const lower = candidate.toLowerCase();
    const score = names.filter((name) => name.toLowerCase().includes(lower)).length;
    if (score > bestScore || (score === bestScore && candidate.length < best.length)) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** Pokémon and artist groupings of the whole catalog, built once per catalog load. */
export class CatalogIndex {
  readonly pokemon: PokemonSummary[];
  readonly artists: ArtistSummary[];
  private readonly cardsByDex = new Map<number, Card[]>();
  private readonly cardsByArtist = new Map<string, Card[]>();
  private readonly dexBySlug = new Map<string, number>();
  private readonly artistBySlug = new Map<string, ArtistSummary>();

  constructor(cards: Card[]) {
    const oldestFirst = sortExploreCards(cards, "oldest");
    const artistCards = new Map<string, Card[]>();

    for (const card of oldestFirst) {
      for (const dex of new Set(card.nationalPokedexNumbers ?? [])) {
        const list = this.cardsByDex.get(dex) ?? [];
        list.push(card);
        this.cardsByDex.set(dex, list);
      }
      // Spelling variants of one name ("Kagemaru Himeno" / "kagemaru himeno") share a page.
      const artistKey = card.artist ? slugify(card.artist) : "";
      if (artistKey) {
        const list = artistCards.get(artistKey) ?? [];
        list.push(card);
        artistCards.set(artistKey, list);
      }
    }

    const pokemon = [...this.cardsByDex.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dex, list]) => {
        // Name from cards of this species alone, not tag teams like "Pikachu & Zekrom-GX".
        const solo = list.filter((card) => card.nationalPokedexNumbers?.length === 1);
        const latestWithArt = [...list].reverse().find((card) => card.images.small || card.images.large);
        return {
          dex,
          name: speciesName((solo.length > 0 ? solo : list).map((card) => card.name)),
          count: list.length,
          image: latestWithArt ? latestWithArt.images.small || latestWithArt.images.large : "",
        };
      });
    this.pokemon = assignSlugs(pokemon);
    for (const entry of this.pokemon) this.dexBySlug.set(entry.slug, entry.dex);

    this.artists = [...artistCards.entries()]
      .map(([slug, list]) => ({ slug, name: speciesName(list.map((card) => card.artist!.trim())), count: list.length }))
      .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    for (const artist of this.artists) {
      this.artistBySlug.set(artist.slug, artist);
      this.cardsByArtist.set(artist.slug, artistCards.get(artist.slug) ?? []);
    }
  }

  pokemonBySlug(slug: string): PokemonSummary | null {
    const dex = this.dexBySlug.get(slug);
    return dex === undefined ? null : (this.pokemon.find((entry) => entry.dex === dex) ?? null);
  }

  pokemonByDex(dex: number): PokemonSummary | null {
    return this.pokemon.find((entry) => entry.dex === dex) ?? null;
  }

  /** Every printing of a Pokémon, oldest set first. */
  cardsForDex(dex: number): Card[] {
    return this.cardsByDex.get(dex) ?? [];
  }

  artistBySlugName(slug: string): ArtistSummary | null {
    return this.artistBySlug.get(slug) ?? null;
  }

  /** An artist's cards, oldest set first. */
  cardsForArtist(slug: string): Card[] {
    return this.cardsByArtist.get(slug) ?? [];
  }

  history(dex: number): PokemonCardHistory {
    const cards = this.cardsForDex(dex);
    const solo = cards.filter((card) => card.nationalPokedexNumbers?.length === 1);
    const point = (card: Card | undefined) =>
      card ? { cardId: card.id, setName: card.set.name, releaseDate: card.set.releaseDate } : undefined;
    const evolvesFrom = solo.find((card) => card.evolvesFrom)?.evolvesFrom;
    const evolvesTo = [...new Set(solo.flatMap((card) => card.evolvesTo ?? []))];

    // "Evolves to" is rarely on cards; find Pokémon whose cards evolve from this one instead.
    const name = this.pokemonByDex(dex)?.name;
    if (name && evolvesTo.length === 0) {
      for (const entry of this.pokemon) {
        const from = this.cardsForDex(entry.dex).find((card) => card.evolvesFrom)?.evolvesFrom;
        if (from && from.toLowerCase() === name.toLowerCase()) evolvesTo.push(entry.name);
      }
    }

    return {
      cardCount: cards.length,
      setCount: new Set(cards.map((card) => card.set.id)).size,
      artistCount: new Set(cards.flatMap((card) => (card.artist ? [card.artist] : []))).size,
      first: point(cards[0]),
      latest: point(cards.at(-1)),
      evolvesFrom,
      evolvesTo,
    };
  }

  artistHistory(slug: string): ArtistHistory {
    const cards = this.cardsForArtist(slug);
    const counts = new Map<number, number>();
    for (const card of cards) {
      for (const dex of card.nationalPokedexNumbers ?? []) counts.set(dex, (counts.get(dex) ?? 0) + 1);
    }
    const topPokemon = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .flatMap(([dex, count]) => {
        const entry = this.pokemonByDex(dex);
        return entry ? [{ name: entry.name, slug: entry.slug, count }] : [];
      });
    const point = (card: Card | undefined) => (card ? { setName: card.set.name, releaseDate: card.set.releaseDate } : undefined);
    return { first: point(cards[0]), latest: point(cards.at(-1)), topPokemon };
  }

  /** Name lookup for linking "Evolves from: Pichu" to Pichu's page. */
  pokemonByName(name: string): PokemonSummary | null {
    const lower = name.trim().toLowerCase();
    return this.pokemon.find((entry) => entry.name.toLowerCase() === lower) ?? null;
  }
}
