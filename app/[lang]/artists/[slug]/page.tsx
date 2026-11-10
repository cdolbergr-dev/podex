import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { CardGrid } from "@/components/card-grid";
import { LocaleLink } from "@/components/i18n-provider";
import { PageContainer } from "@/components/page-container";
import { DetailFallback } from "@/components/skeletons";
import { formatCount } from "@/lib/format";
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

  return (
    <article>
      <LocaleLink href="/artists" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.artists.allArtists}
      </LocaleLink>
      <header className="mt-6 mb-8 max-w-3xl">
        <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">{page.artist.name}</h1>
        <p className="mt-3 text-sm text-muted">{t.artists.pageIntro(formatCount(page.cards.length, locale), page.cards.length)}</p>
      </header>
      <CardGrid cards={page.cards} returnTo={`/artists/${page.artist.slug}`} />
    </article>
  );
}
