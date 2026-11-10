import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LocaleLink } from "@/components/i18n-provider";
import { pokemonSubtitle } from "@/components/pokemon-history";
import { formatReleaseDate } from "@/lib/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { getCardOfTheDay } from "@/lib/tcg/collections";

/** Today's featured card with a little of its Pokémon's story; hidden if anything fails. */
export async function CardOfTheDay() {
  const [featured, locale, t] = await Promise.all([getCardOfTheDay().catch(() => null), getLocale(), getDictionary()]);
  if (!featured) return null;
  const { card, pokemon, history, species } = featured;
  const text = locale === "es" && species?.es.entry ? species.es : species?.en;
  const firstYear = history.first?.releaseDate
    ? formatReleaseDate(history.first.releaseDate, locale)?.match(/\d{4}/)?.[0]
    : undefined;
  const cardHref = `/cards/${encodeURIComponent(card.id)}`;

  return (
    <section
      aria-labelledby="card-of-the-day"
      className="flex min-h-[138px] gap-4 rounded-2xl border border-border bg-surface p-3 sm:min-h-[168px] sm:gap-5 sm:p-4 lg:w-[28rem]"
    >
      <LocaleLink href={cardHref} className="relative aspect-[63/88] w-20 shrink-0 overflow-hidden rounded-md bg-art sm:w-24">
        <Image
          src={card.images.small || card.images.large}
          alt={t.card.imageAlt(card.name, card.set.name, card.number)}
          fill
          sizes="96px"
          className="object-contain"
        />
      </LocaleLink>
      <div className="min-w-0 flex-1">
        <p id="card-of-the-day" className="text-xs text-faint">
          {t.cardOfTheDay.title}
        </p>
        <h2 className="mt-0.5 truncate text-base font-medium tracking-tight">
          <LocaleLink href={cardHref} className="hover:underline">
            {card.name}
          </LocaleLink>
        </h2>
        <p className="truncate text-xs text-muted">
          {card.set.name}
          {card.rarity ? ` · ${card.rarity}` : ""}
        </p>
        <p className="mt-2 text-xs text-muted tabular-nums">{pokemonSubtitle(pokemon, species, locale, t)}</p>
        {text?.entry ? (
          <p lang={text === species?.es ? "es" : "en"} className="mt-1 line-clamp-2 text-xs leading-5 text-soft sm:line-clamp-3">
            {text.entry}
          </p>
        ) : null}
        {history.first ? (
          <p className="mt-1 truncate text-xs text-faint">
            {t.pokemon.firstCard}: {history.first.setName}
            {firstYear ? ` (${firstYear})` : ""}
          </p>
        ) : null}
        <LocaleLink
          href={`/pokemon/${pokemon.slug}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
        >
          {t.cardOfTheDay.allCardsOf(pokemon.name)}
          <ArrowRight aria-hidden="true" className="size-3" />
        </LocaleLink>
      </div>
    </section>
  );
}
