import { LocaleLink } from "@/components/i18n-provider";
import { formatCount, formatReleaseDate } from "@/lib/format";
import { dexLabel, generationOf, romanNumeral } from "@/lib/generations";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { PokemonSpecies } from "@/lib/pokeapi";
import type { PokemonCardHistory, PokemonSummary } from "@/lib/tcg/catalog-index";

type Linkable = PokemonSummary | { name: string };

function PokemonName({ pokemon }: { pokemon: Linkable }) {
  if (!("slug" in pokemon)) return <>{pokemon.name}</>;
  return (
    <LocaleLink href={`/pokemon/${pokemon.slug}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
      {pokemon.name}
    </LocaleLink>
  );
}

/** "#025 · Mouse Pokémon · Generation I" */
export function pokemonSubtitle(pokemon: PokemonSummary, species: PokemonSpecies | null, locale: Locale, t: Dictionary) {
  const text = locale === "es" ? species?.es : species?.en;
  const generation = species?.generation ?? generationOf(pokemon.dex);
  return [dexLabel(pokemon.dex), text?.genus, generation <= 9 ? t.pokemon.generation(romanNumeral(generation)) : null]
    .filter(Boolean)
    .join(" · ");
}

/** The Pokédex entry from its first game; English on Danish pages (PokéAPI has no Danish). */
export function PokedexEntry({ species, locale, t }: { species: PokemonSpecies | null; locale: Locale; t: Dictionary }) {
  const text = locale === "es" && species?.es.entry ? species.es : species?.en;
  if (!text?.entry) return null;
  return (
    <figure>
      <blockquote lang={text === species?.es ? "es" : "en"} className="text-base leading-7 text-soft text-pretty">
        “{text.entry}”
      </blockquote>
      {text.game ? <figcaption className="mt-2 text-xs text-faint">{t.pokemon.pokedexEntry(text.game)}</figcaption> : null}
    </figure>
  );
}

/** Facts from the catalog: first and newest printing, how many cards and artists, evolutions. */
export function PokemonFacts({
  history,
  species,
  evolvesFrom,
  evolvesTo,
  locale,
  t,
}: {
  history: PokemonCardHistory;
  species: PokemonSpecies | null;
  evolvesFrom?: Linkable;
  evolvesTo: Linkable[];
  locale: Locale;
  t: Dictionary;
}) {
  const count = (value: number) => formatCount(value, locale);
  const printing = (point: PokemonCardHistory["first"]) =>
    point ? (
      <LocaleLink href={`/cards/${encodeURIComponent(point.cardId)}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
        {point.setName}
        {point.releaseDate ? ` (${formatReleaseDate(point.releaseDate, locale)?.match(/\d{4}/)?.[0] ?? ""})` : ""}
      </LocaleLink>
    ) : null;

  return (
    <dl className="grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-y-3.5">
      {species?.legendary || species?.mythical ? (
        <>
          <dt className="sr-only">{t.pokemon.category}</dt>
          <dd className="sm:col-span-2">
            <span className="inline-flex rounded-full bg-surface px-2.5 py-1 text-xs text-soft ring-1 ring-border">
              {species.mythical ? t.pokemon.mythical : t.pokemon.legendary}
            </span>
          </dd>
        </>
      ) : null}
      {history.first ? (
        <>
          <dt className="text-muted">{t.pokemon.firstCard}</dt>
          <dd>{printing(history.first)}</dd>
        </>
      ) : null}
      {history.latest && history.latest.cardId !== history.first?.cardId ? (
        <>
          <dt className="text-muted">{t.pokemon.newestCard}</dt>
          <dd>{printing(history.latest)}</dd>
        </>
      ) : null}
      <dt className="text-muted">{t.pokemon.printingsLabel}</dt>
      <dd>
        {t.pokemon.printings(count(history.cardCount), count(history.setCount))}
        {history.artistCount > 0 ? (
          <span className="block text-muted">{t.pokemon.artists(count(history.artistCount), history.artistCount)}</span>
        ) : null}
      </dd>
      {evolvesFrom ? (
        <>
          <dt className="text-muted">{t.pokemon.evolvesFrom}</dt>
          <dd>
            <PokemonName pokemon={evolvesFrom} />
          </dd>
        </>
      ) : null}
      {evolvesTo.length > 0 ? (
        <>
          <dt className="text-muted">{t.pokemon.evolvesTo}</dt>
          <dd>
            {evolvesTo.map((pokemon, index) => (
              <span key={pokemon.name}>
                {index > 0 ? ", " : ""}
                <PokemonName pokemon={pokemon} />
              </span>
            ))}
          </dd>
        </>
      ) : null}
    </dl>
  );
}
