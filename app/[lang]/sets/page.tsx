import type { Metadata } from "next";
import { Suspense } from "react";
import { ErrorPanel } from "@/components/empty-state";
import { PageContainer } from "@/components/page-container";
import { RetryButton } from "@/components/retry-button";
import { SetBrowser } from "@/components/set-browser";
import { SetsFallback } from "@/components/skeletons";
import { formatCount } from "@/lib/format";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { catalogErrorMessage } from "@/lib/tcg/errors";
import { getSets } from "@/lib/tcg/service";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return { title: t.meta.setsTitle, description: t.meta.setsDescription, alternates: languageAlternates(locale, "/sets") };
}

export default async function SetsPage() {
  const t = await getDictionary();
  return (
    <main className="pb-20">
      <PageContainer>
        <header className="max-w-2xl pt-10 pb-8 sm:pt-14">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.sets.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">{t.sets.intro}</p>
        </header>
        <Suspense fallback={<SetsFallback />}>
          <SetsContent />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function SetsContent() {
  const [loaded, locale, t] = await Promise.all([loadSets(), getLocale(), getDictionary()]);
  if (!loaded.ok) {
    return <ErrorPanel message={loaded.message} action={<RetryButton />} />;
  }

  return (
    <div>
      <p className="mb-8 text-sm text-muted">
        <span className="tabular-nums">{t.sets.count(formatCount(loaded.sets.length, locale), loaded.sets.length)}</span>
      </p>
      <SetBrowser sets={loaded.sets} />
    </div>
  );
}

async function loadSets() {
  try {
    const sets = await getSets();
    return { ok: true as const, sets };
  } catch (error) {
    return { ok: false as const, message: catalogErrorMessage(error) };
  }
}
