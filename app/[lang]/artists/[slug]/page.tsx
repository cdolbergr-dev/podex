import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { CardGrid } from "@/components/card-grid";
import { JsonLd } from "@/components/json-ld";
import { LocaleLink } from "@/components/i18n-provider";
import { PageContainer } from "@/components/page-container";
import { DetailFallback } from "@/components/skeletons";
import { formatCount, formatReleaseDate } from "@/lib/format";
import { artistJsonLd } from "@/lib/structured-data";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getArtistPage } from "@/lib/tcg/collections";

type ArtistPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ArtistPageProps): Promise<Metadata> {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  const page = await getArtistPage(slug).catch(() => null);
  if (!page) return { title: t.artists.title };
  const description = t.artists.pageDescription(page.artist.name, formatCount(page.cards.length, locale));
  return {
    title: page.artist.name,
    description,
    alternates: languageAlternates(locale, `/artists/${page.artist.slug}`),
    openGraph: { title: page.artist.name, description },
  };
}

export default function ArtistPage(props: ArtistPageProps) {
  return (
    <main className="pb-20">
      <PageContainer className="py-8 sm:py-12">
        <Suspense fallback={<DetailFallback />}>
          <ArtistContent {...props} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function ArtistContent({ params }: ArtistPageProps) {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  const page = await getArtistPage(slug);
  if (!page) notFound();
  const { artist, cards, history } = page;
  const withYear = (point: typeof history.first) => {
    if (!point) return "";
    const year = formatReleaseDate(point.releaseDate, locale)?.match(/\d{4}/)?.[0];
    return year ? `${point.setName} (${year})` : point.setName;
  };
  const summary =
    history.first && history.latest
      ? t.artists.summary(artist.name, formatCount(cards.length, locale), withYear(history.first), withYear(history.latest))
      : t.artists.pageDescription(artist.name, formatCount(cards.length, locale));

  return (
    <article>
      <JsonLd data={artistJsonLd(artist, cards, summary, locale, t)} />
      <LocaleLink href="/artists" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.artists.allArtists}
      </LocaleLink>
      <header className="mt-6 mb-8 max-w-3xl">
        <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">{page.artist.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{summary}</p>
        {history.topPokemon.length > 0 ? (
          <p className="mt-3 text-sm">
            <span className="text-muted">{t.artists.mostDrawn}: </span>
            {history.topPokemon.map((pokemon, index) => (
              <span key={pokemon.slug}>
                {index > 0 ? ", " : ""}
                <LocaleLink
                  href={`/pokemon/${pokemon.slug}`}
                  className="underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {pokemon.name}
                </LocaleLink>
              </span>
            ))}
          </p>
        ) : null}
        <p className="mt-6 text-xs text-faint">{t.artists.pageIntro(formatCount(cards.length, locale), cards.length)}</p>
      </header>
      <CardGrid cards={page.cards} returnTo={`/artists/${page.artist.slug}`} />
    </article>
  );
}
