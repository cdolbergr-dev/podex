import type { Metadata } from "next";
import { Suspense } from "react";
import { FavoritesView } from "@/components/favorites-view";
import { PageContainer } from "@/components/page-container";
import { CardSkeletonGrid } from "@/components/skeletons";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: t.meta.favoritesTitle,
    description: t.meta.favoritesDescription,
    alternates: languageAlternates(locale, "/favorites"),
  };
}

export default function FavoritesPage() {
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        {/* The selected list is read from the URL (useSearchParams) on the client. */}
        <Suspense fallback={<FavoritesFallback />}>
          <FavoritesView />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function FavoritesFallback() {
  const t = await getDictionary();
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.meta.favoritesTitle}</h1>
      <p className="mt-2 text-sm text-muted">{t.favorites.savedInBrowser}</p>
      <div className="mt-6">
        <CardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
