import { brand } from "@/lib/brand";
import { localizePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { setPath } from "@/lib/set-path";
import { siteUrl } from "@/lib/site";
import type { ArtistSummary, PokemonSummary } from "@/lib/tcg/catalog-index";
import type { Card, CardSet } from "@/types/catalog";

/**
 * schema.org data (JSON-LD) that tells search engines and AI assistants what a page is about:
 * the site and its search, a card as an illustrated work in a set, and collection pages.
 */

type Json = Record<string, unknown>;

const absolute = (locale: Locale, path: string) => `${siteUrl}${localizePath(locale, path)}`;

/** Year, from TCGdex's "1999/01/09" dates. */
const year = (date: string | undefined) => date?.slice(0, 4);

function breadcrumbs(items: { name: string; url: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  };
}

function cardList(cards: Card[], locale: Locale): Json {
  return {
    "@type": "ItemList",
    numberOfItems: cards.length,
    // The first cards are enough to describe the list; the page links to every one.
    itemListElement: cards.slice(0, 50).map((card, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absolute(locale, `/cards/${encodeURIComponent(card.id)}`),
      name: `${card.name} (${card.set.name} ${card.number})`,
    })),
  };
}

export function websiteJsonLd(locale: Locale, t: Dictionary): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: absolute(locale, "/"),
    description: t.meta.description,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absolute(locale, "/")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function cardJsonLd(card: Card, locale: Locale, t: Dictionary): Json {
  const url = absolute(locale, `/cards/${encodeURIComponent(card.id)}`);
  const facts = [card.supertype, ...card.subtypes, card.rarity, card.hp ? `${card.hp} HP` : undefined]
    .filter(Boolean)
    .join(" · ");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VisualArtwork",
        "@id": url,
        name: card.name,
        url,
        image: card.images.large || card.images.small || undefined,
        artform: "Trading card",
        description: t.meta.cardDescription(card.name, card.set.name, card.rarity),
        abstract: facts || undefined,
        creator: card.artist ? { "@type": "Person", name: card.artist } : undefined,
        dateCreated: year(card.set.releaseDate),
        identifier: card.id,
        position: card.number,
        isPartOf: {
          "@type": "CreativeWorkSeries",
          name: card.set.name,
          url: absolute(locale, setPath(card.set)),
        },
        about:
          card.nationalPokedexNumbers?.map((dex) => ({ "@type": "Thing", name: card.name, url: absolute(locale, `/pokemon/${dex}`) })) ??
          undefined,
        inLanguage: "en",
      },
      breadcrumbs([
        { name: brand.name, url: absolute(locale, "/") },
        { name: card.set.name, url: absolute(locale, setPath(card.set)) },
        { name: card.name, url },
      ]),
    ],
  };
}

export function pokemonJsonLd(pokemon: PokemonSummary, cards: Card[], description: string, locale: Locale, t: Dictionary): Json {
  const url = absolute(locale, `/pokemon/${pokemon.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: t.pokemon.allCardsOf(pokemon.name),
        description,
        inLanguage: locale,
        about: { "@type": "Thing", name: pokemon.name, identifier: `national-pokedex-${pokemon.dex}` },
        mainEntity: cardList(cards, locale),
      },
      breadcrumbs([
        { name: brand.name, url: absolute(locale, "/") },
        { name: t.pokemon.title, url: absolute(locale, "/pokemon") },
        { name: pokemon.name, url },
      ]),
    ],
  };
}

export function artistJsonLd(artist: ArtistSummary, cards: Card[], description: string, locale: Locale, t: Dictionary): Json {
  const url = absolute(locale, `/artists/${artist.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfilePage",
        "@id": url,
        url,
        name: artist.name,
        description,
        inLanguage: locale,
        mainEntity: {
          "@type": "Person",
          name: artist.name,
          jobTitle: "Illustrator",
          knowsAbout: "Pokémon Trading Card Game illustration",
        },
        hasPart: cardList(cards, locale),
      },
      breadcrumbs([
        { name: brand.name, url: absolute(locale, "/") },
        { name: t.artists.title, url: absolute(locale, "/artists") },
        { name: artist.name, url },
      ]),
    ],
  };
}

export function setJsonLd(set: CardSet, cards: Card[], description: string, locale: Locale, t: Dictionary): Json {
  const url = absolute(locale, setPath(set));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": url,
        url,
        name: set.name,
        description,
        inLanguage: locale,
        image: set.images.logo || undefined,
        about: {
          "@type": "CreativeWorkSeries",
          name: set.name,
          datePublished: set.releaseDate?.replace(/\//g, "-"),
          isPartOf: set.series ? { "@type": "CreativeWorkSeries", name: set.series } : undefined,
        },
        mainEntity: cardList(cards, locale),
      },
      breadcrumbs([
        { name: brand.name, url: absolute(locale, "/") },
        { name: t.sets.title, url: absolute(locale, "/sets") },
        { name: set.name, url },
      ]),
    ],
  };
}
