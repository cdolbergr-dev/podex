"use client";

import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";
import type { DkkRates } from "@/lib/exchange-rates";
import type { CardPrices } from "@/types/catalog";

function money(value: number, currency: "USD" | "EUR", locale: Locale, dkk: DkkRates | null): string {
  if (dkk) {
    const kroner = value * (currency === "EUR" ? dkk.eur : dkk.usd);
    // Converted amounts are approximate; whole kroner read better than øre.
    return `≈ ${new Intl.NumberFormat(INTL_LOCALES[locale], {
      style: "currency",
      currency: "DKK",
      maximumFractionDigits: kroner < 10 ? 2 : 0,
    }).format(kroner)}`;
  }
  return new Intl.NumberFormat(INTL_LOCALES[locale], { style: "currency", currency }).format(value);
}

function updatedLabel(value: string | undefined, locale: Locale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function PricesSection({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="mt-10 border-t border-border pt-6" aria-labelledby="market-price-heading">
      <h2 id="market-price-heading" className="text-sm font-medium">
        {t.prices.heading}
      </h2>
      <div className="mt-4 min-h-24">{children}</div>
    </section>
  );
}

export function CardPricesPanel({ prices, dkk = null }: { prices: CardPrices | null; dkk?: DkkRates | null }) {
  const { locale, t } = useI18n();
  if (!prices) {
    return (
      <PricesSection>
        <p className="text-sm text-muted">{t.prices.none}</p>
      </PricesSection>
    );
  }

  const updated = updatedLabel(prices.updated, locale);

  return (
    <PricesSection>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2.5 text-sm">
        {prices.tcgplayer?.variants.map((variant) => (
          <div key={variant.label} className="contents">
            <dt className="text-muted">
              {t.prices.tcgplayer} <span className="text-faint">·</span> {t.prices.variants[variant.label] ?? variant.label}
            </dt>
            <dd className="text-right font-medium tabular-nums">{money(variant.price, "USD", locale, dkk)}</dd>
          </div>
        ))}
        {prices.cardmarket ? (
          <div className="contents">
            <dt className="text-muted">
              {t.prices.cardmarketTrend}
            </dt>
            <dd className="text-right font-medium tabular-nums">
              {money(prices.cardmarket.trend, "EUR", locale, dkk)}
              {prices.cardmarket.avg30 ? (
                <span className="ml-2 font-normal text-faint">{t.prices.avg30(money(prices.cardmarket.avg30, "EUR", locale, dkk))}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
        <span>{updated ? t.prices.updatedVia(updated) : t.prices.via}</span>
        {dkk ? <span>{t.prices.converted}</span> : null}
        {prices.tcgplayer?.url ? (
          <a
            href={prices.tcgplayer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline decoration-border underline-offset-4 hover:text-foreground"
          >
            {t.prices.viewOnTcgplayer}
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
        ) : null}
      </p>
    </PricesSection>
  );
}

export function CardPricesSkeleton() {
  const { t } = useI18n();
  return (
    <PricesSection>
      <div role="status" className="space-y-3">
        <span className="sr-only">{t.prices.loading}</span>
        <div className="h-4 w-full animate-pulse rounded-full bg-skeleton-soft" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-skeleton-soft" />
      </div>
    </PricesSection>
  );
}
