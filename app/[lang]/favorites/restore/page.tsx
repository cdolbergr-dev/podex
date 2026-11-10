import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { RestoreFavorites } from "@/components/restore-favorites";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.meta.restoreTitle, description: t.meta.restoreDescription, robots: { index: false } };
}

export default function RestoreFavoritesPage() {
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <RestoreFavorites />
      </PageContainer>
    </main>
  );
}
