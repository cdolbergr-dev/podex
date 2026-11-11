import type { Metadata } from "next";
import { Suspense } from "react";
import { CollectionView } from "@/components/collection-view";
import { PageContainer } from "@/components/page-container";
import { SavedTabs } from "@/components/saved-tabs";
import { CardSkeletonGrid } from "@/components/skeletons";
import { getDictionary } from "@/lib/i18n/server";
import { setCardTotal } from "@/lib/owned";
import { setPath } from "@/lib/set-path";
import { getSets } from "@/lib/tcg/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  // Personal to each browser: nothing for search engines here.
  return { title: t.collection.title, description: t.collection.description, robots: { index: false } };
}

export default function CollectionPage() {
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <SavedTabs active="collection" />
        <Suspense fallback={<CardSkeletonGrid count={8} />}>
          <CollectionContent />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function CollectionContent() {
  const sets = await getSets().catch(() => []);
  return (
    <CollectionView
      sets={sets.map((set) => ({ id: set.id, name: set.name, path: setPath(set), total: setCardTotal(set) }))}
    />
  );
}
