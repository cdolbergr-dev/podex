import { Suspense } from "react";
import { ExploreContent } from "@/components/explore-content";
import { PageContainer } from "@/components/page-container";
import { ExploreFallback } from "@/components/skeletons";
import { brand } from "@/lib/brand";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [lead, rest] = brand.headline.split(". ");

  return (
    <main className="pb-20">
      <PageContainer>
        <header className="max-w-lg pt-8 pb-4 sm:pt-10 sm:pb-5">
          <h1 className="text-2xl leading-snug font-medium tracking-[-0.02em] text-balance sm:text-[1.75rem]">
            {lead}.<span className="mt-0.5 block">{rest}</span>
          </h1>
          <p className="mt-2 text-sm text-muted">{brand.tagline}</p>
        </header>
        <Suspense fallback={<ExploreFallback />}>
          <ExploreContent searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </main>
  );
}
