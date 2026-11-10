import type { Metadata } from "next";
import { Suspense } from "react";
import { FavoritesView } from "@/components/favorites-view";
import { PageContainer } from "@/components/page-container";
import { CardSkeletonGrid } from "@/components/skeletons";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Cards saved in this browser.",
};

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

function FavoritesFallback() {
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Favorites</h1>
      <p className="mt-2 text-sm text-muted">Saved in this browser</p>
      <div className="mt-6">
        <CardSkeletonGrid count={8} />
      </div>
    </div>
  );
}
