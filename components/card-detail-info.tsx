import type { ReactNode } from "react";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { cardNumberLabel, legalFormatLabel } from "@/lib/format";
import type { Card } from "@/types/catalog";

/**
 * Right-column card details. Pure render so the modal can show it instantly from grid data;
 * `prices` is a slot because they are fetched separately on the server.
 */
export function CardDetailInfo({ card, prices }: { card: Card; prices?: ReactNode }) {
  const formats = legalFormatLabel(card);
  const retreat =
    typeof card.convertedRetreatCost === "number"
      ? String(card.convertedRetreatCost)
      : card.retreatCost
        ? String(card.retreatCost.length)
        : null;

  return (
    <>
      <p className="text-sm text-muted">
            {[card.supertype, ...card.subtypes].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <h1 className="text-4xl font-medium tracking-tight text-balance sm:text-5xl">{card.name}</h1>
            <FavoriteButton id={card.id} name={card.name} variant="label" />
          </div>

          {card.types.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2">
              {card.types.map((type) => (
                <li key={type} className="rounded-full bg-surface px-2.5 py-1 text-xs text-soft ring-1 ring-border">
                  {type}
                </li>
              ))}
            </ul>
          ) : null}

          <dl className="mt-8 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-y-3.5">
            <Fact label="Set">
              <Link href={`/?set=${encodeURIComponent(card.set.id)}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                {card.set.name}
              </Link>
            </Fact>
            <Fact label="Number">{cardNumberLabel(card)}</Fact>
            {card.rarity ? <Fact label="Rarity">{card.rarity}</Fact> : null}
            {card.hp ? <Fact label="HP">{card.hp}</Fact> : null}
            {card.evolvesFrom ? <Fact label="Evolves from">{card.evolvesFrom}</Fact> : null}
            {card.evolvesTo && card.evolvesTo.length > 0 ? (
              <Fact label="Evolves to">{card.evolvesTo.join(", ")}</Fact>
            ) : null}
            {retreat !== null ? <Fact label="Retreat">{retreat}</Fact> : null}
            {card.artist ? <Fact label="Illustrator">{card.artist}</Fact> : null}
            {formats ? <Fact label="Legal in">{formats}</Fact> : null}
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
            <Section title="Abilities">
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
            <Section title="Attacks">
              <ul className="space-y-6">
                {card.attacks.map((attack) => (
                  <li key={attack.name}>
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        {attack.cost.length > 0 ? (
                          <p className="mb-1.5 flex flex-wrap gap-1" aria-label={`Energy cost: ${attack.cost.join(", ")}`}>
                            {attack.cost.map((cost, index) => (
                              <span
                                key={`${attack.name}-${cost}-${index}`}
                                className="rounded-full bg-skeleton-soft px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-soft uppercase"
                              >
                                {cost}
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
            <Section title="Matchups">
              <dl className="grid gap-3 text-sm">
                {card.weaknesses?.map((item) => (
                  <div key={`weak-${item.type}`} className="grid grid-cols-[9rem_1fr]">
                    <dt className="text-muted">Weakness</dt>
                    <dd>
                      {item.type} {item.value}
                    </dd>
                  </div>
                ))}
                {card.resistances?.map((item) => (
                  <div key={`resist-${item.type}`} className="grid grid-cols-[9rem_1fr]">
                    <dt className="text-muted">Resistance</dt>
                    <dd>
                      {item.type} {item.value}
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
