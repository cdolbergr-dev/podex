import type { Metadata } from "next";
import { CardScanner } from "@/components/card-scanner";
import { PageContainer } from "@/components/page-container";
import { languageAlternates } from "@/lib/i18n/alternates";
import { getDictionary, getLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: t.scan.title,
    description: t.scan.description,
    alternates: languageAlternates(locale, "/scan"),
  };
}

export default async function ScanPage() {
  const t = await getDictionary();
  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t.scan.title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{t.scan.description}</p>
        <div className="mt-8">
          <CardScanner />
        </div>
      </PageContainer>
    </main>
  );
}
