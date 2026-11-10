"use client";

import type { ReactNode } from "react";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { FavoriteButton } from "@/components/favorite-button";
import { cardNumberLabel, legalFormatLabel } from "@/lib/format";
import type { Card } from "@/types/catalog";

/**
 * Right-column card details. Pure render so the modal can show it instantly from grid data;
 * `prices` is a slot because they are fetched separately on the server.
 */
export function CardDetailInfo({ card, prices }: { card: Card; prices?: ReactNode }) {
  const { t } = useI18n();
  const formats = legalFormatLabel(card, t.card.formats);
  const typeName = (type: string) => t.types[type] ?? type;
  const retreat =
    typeof card.convertedRetreatCost === "number"
      ? String(card.convertedRetreatCost)
      : card.retreatCost
        ? String(card.retreatCost.length)
        : null;

  return (
    <>
      <p className="text-sm text-muted">
            {[t.supertypes[card.supertype] ?? card.supertype, ...card.subtypes].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">{card.name}</h1>
            <FavoriteButton id={card.id} name={card.name} variant="label" />
          </div>

          {card.types.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {card.types.map((type) => (
                <li key={type} className="rounded-full bg-surface px-2.5 py-1 text-xs text-soft ring-1 ring-border">
                  {typeName(type)}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="mt-8 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-y-3.5">
            <Fact label={t.card.set}>
              <LocaleLink href={`/?set=${encodeURIComponent(card.set.id)}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                {card.set.name}
              </LocaleLink>
            </Fact>
            <Fact label={t.card.number}>{cardNumberLabel(card)}</Fact>
            {card.rarity ? <Fact label={t.card.rarity}>{card.rarity}</Fact> : null}
            {card.hp ? <Fact label={t.card.hp}>{card.hp}</Fact> : null}
            {card.evolvesFrom ? <Fact label={t.card.evolvesFrom}>{card.evolvesFrom}</Fact> : null}
            {card.evolvesTo && card.evolvesTo.length > 0 ? (
              <Fact label={t.card.evolvesTo}>{card.evolvesTo.join(", ")}</Fact>
            ) : null}
            {retreat !== null ? <Fact label={t.card.retreat}>{retreat}</Fact> : null}
            {card.artist ? <Fact label={t.card.illustrator}>{card.artist}</Fact> : null}
            {formats ? <Fact label={t.card.legalIn}>{formats}</Fact> : null}
          </dl>

          {prices}

          {card.rules && card.rules.length > 0 ? (
            <div className="mt-8 space-y-2 text-sm leading-6 text-muted">
              {card.rules.map((rule) => (
                <p key={rule}>{rule}</p>
              ))}
            </div>
          ) : null}

          {card.abilities && card.abilities.length > 0 ? (
            <Section title={t.card.abilities}>
              <ul className="space-y-5">
                {card.abilities.map((ability) => (
                  <li key={`${ability.type}-${ability.name}`}>
                    <p className="text-sm">
                      <span className="text-muted">{ability.type}</span>
                      <span className="mx-2 text-faint">·</span>
                      <span className="font-medium">{ability.name}</span>
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-soft">{ability.text}</p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {card.attacks && card.attacks.length > 0 ? (
            <Section title={t.card.attacks}>
              <ul className="space-y-6">
                {card.attacks.map((attack) => (
                  <li key={attack.name}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        {attack.cost.length > 0 ? (
                          <p className="mb-1.5 flex flex-wrap gap-1" aria-label={t.card.energyCost(attack.cost.map(typeName).join(", "))}>
                            {attack.cost.map((cost, index) => (
                              <span
                                key={`${attack.name}-${cost}-${index}`}
                                className="rounded-full bg-skeleton-soft px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-soft uppercase"
                              >
                                {typeName(cost)}
                              </span>
                            ))}
                          </p>
                        ) : null}
                        <h3 className="text-base font-medium">{attack.name}</h3>
                      </div>
                      {attack.damage ? <p className="text-base font-medium tabular-nums">{attack.damage}</p> : null}
                    </div>
                    {attack.text ? <p className="mt-1.5 text-sm leading-6 text-soft">{attack.text}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {card.weaknesses || card.resistances ? (
            <Section title={t.card.matchups}>
              <dl className="grid gap-3 text-sm">
                {card.weaknesses?.map((item) => (
                  <div key={`weak-${item.type}`} className="grid grid-cols-[9rem_1fr]">
                    <dt className="text-muted">{t.card.weakness}</dt>
                    <dd>
                      {typeName(item.type)} {item.value}
                    </dd>
                  </div>
                ))}
                {card.resistances?.map((item) => (
                  <div key={`resist-${item.type}`} className="grid grid-cols-[9rem_1fr]">
                    <dt className="text-muted">{t.card.resistance}</dt>
                    <dd>
                      {typeName(item.type)} {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          ) : null}

          {card.flavorText ? (
            <blockquote className="mt-10 border-t border-border pt-6 text-sm leading-6 text-muted italic">
              {card.flavorText}
            </blockquote>
          ) : null}
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
