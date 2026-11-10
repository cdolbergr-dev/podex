import { CardCacheSeed } from "@/components/card-cache-seed";
import { CardTile } from "@/components/card-tile";
import type { Card } from "@/types/catalog";

export function CardGrid({
  cards,
  returnTo,
  priorityCount = 4,
  showOwned = false,
}: {
  cards: Card[];
  returnTo?: string;
  priorityCount?: number;
  showOwned?: boolean;
}) {
  return (
    <>
      <CardCacheSeed cards={cards} />
      <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cards.map((card, index) => (
          <li key={card.id}>
            <CardTile card={card} returnTo={returnTo} priority={index < priorityCount} showOwned={showOwned} />
          </li>
        ))}
      </ul>
    </>
  );
}
