"use client";

import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { PageContainer } from "@/components/page-container";

/** Shared body of the not-found pages (client so it can read the language from context). */
export function NotFoundMessage({ kind }: { kind: "page" | "card" }) {
  const { t } = useI18n();
  return (
    <main className="pb-20">
      <PageContainer className="flex min-h-[50vh] flex-col justify-center">
        <h1 className="text-3xl font-medium tracking-tight">
          {kind === "card" ? t.errors.cardNotFound : t.errors.pageNotFound}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          {kind === "card" ? t.errors.cardNotInCatalog : t.errors.pageNotInCatalog}
        </p>
        <LocaleLink
          href="/"
          className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-foreground px-4 text-sm text-surface"
        >
          {t.common.backToExplore}
        </LocaleLink>
      </PageContainer>
    </main>
  );
}
