import type { Metadata } from "next";
import { Suspense } from "react";
import { CardOfTheDay } from "@/components/card-of-the-day";
import { ExploreContent } from "@/components/explore-content";
import { PageContainer } from "@/components/page-container";
import { ExploreFallback } from "@/components/skeletons";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { alternates: languageAlternates(await getLocale(), "/") };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getDictionary();

  return (
    <main className="pb-20">
      <PageContainer>
        <div className="flex flex-col gap-x-10 gap-y-2 pt-8 pb-4 sm:pt-10 sm:pb-5 lg:flex-row lg:items-start lg:justify-between">
          <header className="max-w-lg">
            <h1 className="text-2xl leading-snug font-medium tracking-[-0.02em] text-balance sm:text-[1.75rem]">
              {t.meta.headlineLead}
              <span className="mt-0.5 block">{t.meta.headlineRest}</span>
            </h1>
            <p className="mt-2 text-sm text-muted">{t.meta.tagline}</p>
          </header>
          <Suspense
            fallback={
              <div aria-hidden="true" className="h-[138px] animate-pulse rounded-2xl bg-skeleton-soft sm:h-[168px] lg:w-[28rem]" />
            }
          >
            <FeaturedWhenBrowsing searchParams={searchParams} />
          </Suspense>
        </div>
        <Suspense fallback={<ExploreFallback />}>
          <ExploreContent searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

/** The card of the day belongs to the plain front page, not to searches or filtered lists. */
async function FeaturedWhenBrowsing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const narrowed = ["q", "set", "type", "rarity"].some((key) => query[key]);
  return narrowed ? null : <CardOfTheDay />;
}
