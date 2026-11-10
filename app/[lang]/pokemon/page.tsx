import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorPanel } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { PokemonIndex } from "@/components/pokemon-index";
import { RetryButton } from "@/components/retry-button";
import { SetsFallback } from "@/components/skeletons";
import { formatCount } from "@/lib/format";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getPokemonIndex } from "@/lib/tcg/collections";
import { catalogErrorMessage } from "@/lib/tcg/errors";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return { title: t.pokemon.title, description: t.pokemon.description, alternates: languageAlternates(locale, "/pokemon") };
}

export default async function PokemonIndexPage() {
  const t = await getDictionary();
  return (
    <main className="pb-20">
      <PageContainer>
        <header className="max-w-2xl pt-10 pb-8 sm:pt-14">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.pokemon.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{t.pokemon.intro}</p>
        </header>
        <Suspense fallback={<SetsFallback />}>
          <PokemonIndexContent />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function PokemonIndexContent() {
  const [loaded, locale, t] = await Promise.all([
    getPokemonIndex().then(
      (pokemon) => ({ ok: true as const, pokemon }),
      (error: unknown) => ({ ok: false as const, message: catalogErrorMessage(error) }),
    ),
    getLocale(),
    getDictionary(),
  ]);
  if (!loaded.ok) return <ErrorPanel message={loaded.message} action={<RetryButton />} />;

  return (
    <div>
      <p className="mb-6 text-sm text-muted tabular-nums">{t.pokemon.count(formatCount(loaded.pokemon.length, locale))}</p>
      <PokemonIndex pokemon={loaded.pokemon} />
    </div>
  );
}
