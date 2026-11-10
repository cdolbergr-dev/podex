import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { CardGrid } from "@/components/card-grid";
import { JsonLd } from "@/components/json-ld";
import { LocaleLink } from "@/components/i18n-provider";
import { PageContainer } from "@/components/page-container";
import { PokedexEntry, PokemonFacts, pokemonSubtitle } from "@/components/pokemon-history";
import { DetailFallback } from "@/components/skeletons";
import { formatCount, formatReleaseDate } from "@/lib/format";
import { pokemonJsonLd } from "@/lib/structured-data";
import { languageAlternates } from "@/lib/i18n/alternates";
import { localizePath } from "@/lib/i18n/config";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getPokemonPage, getPokemonSlugByDex } from "@/lib/tcg/collections";

type PokemonPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PokemonPageProps): Promise<Metadata> {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  const page = await getPokemonPage(slug).catch(() => null);
  if (!page) return { title: t.pokemon.title };
  const description = t.pokemon.pageDescription(page.pokemon.name, formatCount(page.cards.length, locale));
  return {
    title: page.pokemon.name,
    description,
    alternates: languageAlternates(locale, `/pokemon/${page.pokemon.slug}`),
    openGraph: { title: page.pokemon.name, description },
  };
}

export default function PokemonPage(props: PokemonPageProps) {
  return (
    <main className="pb-20">
      <PageContainer className="py-8 sm:py-12">
        <Suspense fallback={<DetailFallback />}>
          <PokemonContent {...props} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function PokemonContent({ params }: PokemonPageProps) {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);

  // Card pages link by Pokédex number; send those to the named address.
  if (/^\d+$/.test(slug)) {
    const named = await getPokemonSlugByDex(Number(slug));
    if (!named) notFound();
    permanentRedirect(localizePath(locale, `/pokemon/${named}`));
  }

  const page = await getPokemonPage(slug);
  if (!page) notFound();
  const { pokemon, cards, history, species } = page;
  const count = (value: number) => formatCount(value, locale);
  const summary = history.first
    ? t.pokemon.summary(
        pokemon.name,
        count(history.cardCount),
        count(history.setCount),
        history.first.setName,
        formatReleaseDate(history.first.releaseDate, locale)?.match(/\d{4}/)?.[0] ?? "",
        count(history.artistCount),
      )
    : null;

  return (
    <article>
      <JsonLd data={pokemonJsonLd(pokemon, cards, summary ?? t.pokemon.pageDescription(pokemon.name, count(cards.length)), locale, t)} />
      <LocaleLink href="/pokemon" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.pokemon.allPokemon}
      </LocaleLink>

      <header className="mt-6 max-w-3xl">
        <p className="text-sm text-muted tabular-nums">{pokemonSubtitle(pokemon, species, locale, t)}</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight text-balance sm:text-5xl">{pokemon.name}</h1>
        {summary ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{summary}</p> : null}
      </header>

      <section aria-labelledby="pokemon-history" className="mt-10 grid gap-8 border-t border-border pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 id="pokemon-history" className="mb-4 text-sm font-medium">
            {t.pokemon.history}
          </h2>
          <PokemonFacts
            history={history}
            species={species}
            evolvesFrom={page.evolvesFrom}
            evolvesTo={page.evolvesTo}
            locale={locale}
            t={t}
          />
        </div>
        <PokedexEntry species={species} locale={locale} t={t} />
      </section>

      <section aria-labelledby="pokemon-cards" className="mt-12 border-t border-border pt-6">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 id="pokemon-cards" className="text-sm font-medium">
            {t.pokemon.cardsHeading}{" "}
            <span className="font-normal text-muted tabular-nums">{formatCount(cards.length, locale)}</span>
          </h2>
          <p className="text-xs text-faint">{t.pokemon.oldestFirst}</p>
        </div>
        <CardGrid cards={cards} returnTo={`/pokemon/${pokemon.slug}`} />
      </section>
    </article>
  );
}
