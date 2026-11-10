import { Artwork } from "@/components/artwork";
import { CardTransitionLink } from "@/components/card-transition-link";
import { FavoriteButton } from "@/components/favorite-button";
import { cardHref } from "@/lib/explore-params";
import { cardMetaLabel } from "@/lib/format";
import type { Card } from "@/types/catalog";

const GRID_SIZES = "(min-width: 1280px) 16vw, (min-width: 1024px) 18vw, (min-width: 768px) 22vw, 46vw";

export function CardTile({
  card,
  returnTo,
  priority = false,
}: {
  card: Card;
  returnTo?: string;
  priority?: boolean;
}) {
  const href = cardHref(card.id, returnTo);

  return (
    <article className="group">
      <div className="relative transition duration-300 ease-out group-hover:-translate-y-1 motion-reduce:transform-none">
        <CardTransitionLink
          href={href}
          transitionCard={{
            id: card.id,
            src: card.images.large || card.images.small,
            name: card.name,
            setName: card.set.name,
            number: card.number,
          }}
          className="block rounded-lg transition-shadow duration-300 group-hover:shadow-[0_16px_32px_-20px_rgba(28,25,23,0.55)]"
        >
          <Artwork
            src={card.images.small || card.images.large}
            alt={`${card.name} from ${card.set.name}, card ${card.number}`}
            sizes={GRID_SIZES}
            priority={priority}
            fallback={card.name}
            cardId={card.id}
          />
        </CardTransitionLink>
        <div className="absolute top-0.5 right-0.5">
          <FavoriteButton id={card.id} name={card.name} />
        </div>
      </div>
      <div className="mt-3 space-y-0.5 pr-1">
        <h2 className="truncate text-sm font-medium tracking-tight">
          <CardTransitionLink href={href} transitionCard={{
            id: card.id,
            src: card.images.large || card.images.small,
            name: card.name,
            setName: card.set.name,
            number: card.number,
          }} className="hover:underline">
            {card.name}
          </CardTransitionLink>
        </h2>
        <p className="truncate text-xs text-muted">{card.set.name}</p>
        <p className="truncate text-xs text-faint">{cardMetaLabel(card)}</p>
      </div>
    </article>
  );
}
