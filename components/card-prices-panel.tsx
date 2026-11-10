import { ArrowUpRight } from "lucide-react";
import type { CardPrices } from "@/types/catalog";

function money(value: number, currency: "USD" | "EUR"): string {
  return new Intl.NumberFormat(currency === "EUR" ? "de-DE" : "en-US", { style: "currency", currency }).format(value);
}

function updatedLabel(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function PricesSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-6" aria-labelledby="market-price-heading">
      <h2 id="market-price-heading" className="text-sm font-medium">
        Market price
      </h2>
      <div className="mt-4 min-h-24">{children}</div>
    </section>
  );
}

export function CardPricesPanel({ prices }: { prices: CardPrices | null }) {
  if (!prices) {
    return (
      <PricesSection>
        <p className="text-sm text-muted">No recent market price for this card.</p>
      </PricesSection>
    );
  }

  const updated = updatedLabel(prices.updated);

  return (
    <PricesSection>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2.5 text-sm">
        {prices.tcgplayer?.variants.map((variant) => (
          <div key={variant.label} className="contents">
            <dt className="text-muted">
              TCGplayer <span className="text-faint">·</span> {variant.label}
            </dt>
            <dd className="text-right font-medium tabular-nums">{money(variant.price, "USD")}</dd>
          </div>
        ))}
        {prices.cardmarket ? (
          <div className="contents">
            <dt className="text-muted">
              Cardmarket <span className="text-faint">·</span> Trend
            </dt>
            <dd className="text-right font-medium tabular-nums">
              {money(prices.cardmarket.trend, "EUR")}
              {prices.cardmarket.avg30 ? (
                <span className="ml-2 font-normal text-faint">30d avg {money(prices.cardmarket.avg30, "EUR")}</span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
        <span>{updated ? `Updated ${updated} · via TCGdex` : "Via TCGdex"}</span>
        {prices.tcgplayer?.url ? (
          <a
            href={prices.tcgplayer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline decoration-border underline-offset-4 hover:text-foreground"
          >
            View on TCGplayer
            <ArrowUpRight aria-hidden="true" className="size-3" />
          </a>
        ) : null}
      </p>
    </PricesSection>
  );
}

export function CardPricesSkeleton() {
  return (
    <PricesSection>
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading market prices</span>
        <div className="h-4 w-full animate-pulse rounded-full bg-skeleton-soft" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-skeleton-soft" />
      </div>
    </PricesSection>
  );
}
