import type { Metadata } from "next";
import { Suspense } from "react";
import { ArtistIndex } from "@/components/artist-index";
import { ErrorPanel } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { RetryButton } from "@/components/retry-button";
import { SetsFallback } from "@/components/skeletons";
import { formatCount } from "@/lib/format";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getArtistIndex } from "@/lib/tcg/collections";
import { catalogErrorMessage } from "@/lib/tcg/errors";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return { title: t.artists.title, description: t.artists.description, alternates: languageAlternates(locale, "/artists") };
}

export default async function ArtistsPage() {
  const t = await getDictionary();
  return (
    <main className="pb-20">
      <PageContainer>
        <header className="max-w-2xl pt-10 pb-8 sm:pt-14">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.artists.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{t.artists.intro}</p>
        </header>
        <Suspense fallback={<SetsFallback />}>
          <ArtistsContent />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function ArtistsContent() {
  const [loaded, locale, t] = await Promise.all([
    getArtistIndex().then(
      (artists) => ({ ok: true as const, artists }),
      (error: unknown) => ({ ok: false as const, message: catalogErrorMessage(error) }),
    ),
    getLocale(),
    getDictionary(),
  ]);
  if (!loaded.ok) return <ErrorPanel message={loaded.message} action={<RetryButton />} />;

  return (
    <div>
      <p className="mb-6 text-sm text-muted tabular-nums">{t.artists.count(formatCount(loaded.artists.length, locale))}</p>
      <ArtistIndex artists={loaded.artists} />
    </div>
  );
}
