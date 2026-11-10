import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { RestoreFavorites } from "@/components/restore-favorites";

export const metadata: Metadata = {
  title: "Restore favorites",
  description: "Restore your Podex favorite lists from a backup link.",
  robots: { index: false },
};

export default function RestoreFavoritesPage() {
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <RestoreFavorites />
      </PageContainer>
    </main>
  );
}
