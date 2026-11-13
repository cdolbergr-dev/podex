import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { CardGrid } from "@/components/card-grid";
import { LocaleLink } from "@/components/i18n-provider";
import { JsonLd } from "@/components/json-ld";
import { PageContainer } from "@/components/page-container";
import { SetMark } from "@/components/set-mark";
import { SetProgress } from "@/components/set-progress";
import { DetailFallback } from "@/components/skeletons";
import { formatCount, formatReleaseDate } from "@/lib/format";
import { languageAlternates } from "@/lib/i18n/alternates";
import { localizePath, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { longerSetIds, setCardTotal } from "@/lib/owned";
import { setPath } from "@/lib/set-path";
import { slugify } from "@/lib/slug";
import { setJsonLd } from "@/lib/structured-data";
import { DEFAULT_SORT } from "@/lib/tcg/constants";
import { getSets, getSitemapSets, searchCards } from "@/lib/tcg/service";
import type { CardSet } from "@/types/catalog";

type SetPageProps = { params: Promise<{ slug: string }> };

/** The set at this address: by name (newest wins a tie), or by set id for old/ambiguous links. */
async function findSet(slug: string): Promise<{ set: CardSet; sets: CardSet[]; byId: boolean } | null> {
  const sets = await getSets();
  const byName = sets.find((set) => slugify(set.name) === slug);
  if (byName) return { set: byName, sets, byId: false };
  const byId = sets.find((set) => set.id === slug);
  return byId ? { set: byId, sets, byId: true } : null;
}

function summary(set: CardSet, cardCount: number, locale: Locale, t: Dictionary): string {
  return t.sets.summary(set.name, formatReleaseDate(set.releaseDate, locale), formatCount(setCardTotal(set) || cardCount, locale));
}

/**
 * One real example is prerendered at build. Cache Components needs at least one, and with it every
 * other set page is saved after its first render and then served from the CDN cache until
 * the next deployment, instead of running server code on every visit.
 */
export async function generateStaticParams() {
  const [set] = await getSitemapSets().catch(() => []);
  return [{ slug: set ? slugify(set.name) : "base-set" }];
}

export async function generateMetadata({ params }: SetPageProps): Promise<Metadata> {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  const found = await findSet(slug).catch(() => null);
  if (!found) return { title: t.sets.title };
  const { set } = found;
  const description = summary(set, 0, locale, t);
  return {
    title: set.name,
    description,
    alternates: languageAlternates(locale, setPath(set)),
    openGraph: { title: set.name, description, images: set.images.logo ? [set.images.logo] : undefined },
  };
}

export default function SetPage(props: SetPageProps) {
  return (
    <main className="pb-20">
      <PageContainer className="py-8 sm:py-12">
        <Suspense fallback={<DetailFallback />}>
          <SetContent {...props} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function SetContent({ params }: SetPageProps) {
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getDictionary()]);
  const found = await findSet(slug);
  if (!found) notFound();
  const { set, sets } = found;
  const canonical = setPath(set);
  if (found.byId && canonical !== `/sets/${slug}`) permanentRedirect(localizePath(locale, canonical));

  // A set has at most a few hundred cards: show them all, in the set's own order.
  const result = await searchCards({ q: "", set: set.id, type: "", rarity: "", sort: DEFAULT_SORT, page: 1, pageSize: 1000 });
  const text = summary(set, result.totalCount, locale, t);
  const total = setCardTotal(set) || result.totalCount;

  return (
    <article>
      <JsonLd data={setJsonLd(set, result.cards, text, locale, t)} />
      <LocaleLink href="/sets" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {t.sets.allSets}
      </LocaleLink>

      <header className="mt-6 max-w-3xl">
        {set.images.logo ? (
          <SetMark src={set.images.logo} alt="" sizes="240px" className="mb-5 h-16 w-48 sm:h-20 sm:w-60" />
        ) : null}
        {set.series ? <p className="text-sm text-muted">{set.series}</p> : null}
        <h1 className="mt-1 text-4xl font-medium tracking-tight text-balance sm:text-5xl">{set.name}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">{text}</p>
        <SetProgress setId={set.id} total={total} longer={longerSetIds(set, sets)} />
      </header>

      <section aria-label={t.pokemon.cardsHeading} className="mt-10 border-t border-border pt-6">
        <CardGrid cards={result.cards} returnTo={canonical} showOwned />
      </section>
    </article>
  );
}
