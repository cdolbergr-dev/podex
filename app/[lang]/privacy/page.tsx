import type { Metadata } from "next";
import { Fragment } from "react";
import { PageContainer } from "@/components/page-container";
import { brand } from "@/lib/brand";
import { languageAlternates } from "@/lib/i18n/alternates";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { PRIVACY_UPDATED, privacyPolicies } from "./content";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const policy = privacyPolicies[locale];
  return {
    title: policy.title,
    description: policy.description,
    alternates: languageAlternates(locale, "/privacy"),
  };
}

/** A paragraph with the contact address turned into a mail link. */
function Paragraph({ text }: { text: string }) {
  const parts = text.split(brand.contactEmail);
  return (
    <p>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <a href={`mailto:${brand.contactEmail}`} className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground">
              {brand.contactEmail}
            </a>
          ) : null}
          {part}
        </Fragment>
      ))}
    </p>
  );
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  const policy = privacyPolicies[locale];
  const updated = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(PRIVACY_UPDATED),
  );

  return (
    <main className="pb-20">
      <PageContainer className="pt-10 sm:pt-14">
        <article className="max-w-2xl">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{policy.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {policy.updated}: <time dateTime={PRIVACY_UPDATED}>{updated}</time>
          </p>
          <p className="mt-6 text-base leading-7">{policy.intro}</p>
          {policy.sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="text-lg font-medium">{section.heading}</h2>
              <div className="mt-3 space-y-4 text-sm leading-6 text-muted">
                {section.body.map((text) => (
                  <Paragraph key={text} text={text} />
                ))}
              </div>
            </section>
          ))}
        </article>
      </PageContainer>
    </main>
  );
}
