"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Artwork } from "@/components/artwork";
import { useI18n } from "@/components/i18n-provider";
import {
  CardDetailArtworkProvider,
  useCardDetailArtwork,
} from "@/components/card-detail-artwork-context";
import { CardDetailBack } from "@/components/card-detail-back";
import { CardModalHandoff } from "@/components/card-modal-handoff";
import { CardModalNavButtons } from "@/components/card-modal-nav-buttons";
import { CardTilt } from "@/components/card-tilt";
import { takeCardNavDirection } from "@/lib/card-modal-nav";
import { cardViewTransitionName } from "@/lib/card-transition";
import { safeReturnPath } from "@/lib/explore-params";

function CardDetailArtworkColumn({ id }: { id: string }) {
  const { preview } = useCardDetailArtwork();
  const { t } = useI18n();

  if (preview) {
    return (
      <CardTilt>
        <Artwork
          src={preview.src}
          alt={t.card.imageAlt(preview.name, preview.setName, preview.number)}
          sizes="(min-width: 1024px) 420px, 90vw"
          priority
          fallback={preview.name}
          viewTransitionName={cardViewTransitionName(id)}
          placeholderSrc={preview.displayedSrc}
        />
      </CardTilt>
    );
  }

  return (
    <div
      className="aspect-[63/88] animate-pulse rounded-lg bg-skeleton"
      style={{ viewTransitionName: cardViewTransitionName(id) }}
      aria-hidden="true"
    />
  );
}

function CardDetailTransitionShell({
  id,
  returnTo,
  presentation,
  children,
}: {
  id: string;
  returnTo?: string;
  presentation: "page" | "modal";
  children: ReactNode;
}) {
  const back = safeReturnPath(returnTo);
  const articleRef = useRef<HTMLElement>(null);

  // Arrived via previous/next: slide in from that side (set on the DOM, before first paint).
  useLayoutEffect(() => {
    if (presentation !== "modal" || !articleRef.current) return;
    const direction = takeCardNavDirection(id);
    if (direction) articleRef.current.dataset.navEnter = direction;
  }, [id, presentation]);

  return (
    <article ref={articleRef}>
      {presentation === "page" ? <CardModalHandoff /> : null}
      <div className="flex items-center justify-between gap-4">
        <CardDetailBack returnTo={back} cardId={id} />
        {presentation === "modal" ? <CardModalNavButtons cardId={id} returnTo={back} /> : null}
      </div>

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)] lg:gap-16">
        {/* In the modal the scroller's padding already offsets sticky; top-24 there would drop
            the art once real content makes the grid taller than the preflight shell. */}
        <div
          className={`mx-auto w-full max-w-md lg:sticky lg:mx-0 ${presentation === "modal" ? "lg:top-0" : "lg:top-24"}`}
        >
          <CardDetailArtworkColumn id={id} />
        </div>
        <div>{children}</div>
      </div>
    </article>
  );
}

export function CardDetailTransitionLayout({
  id,
  returnTo,
  presentation = "page",
  children,
}: {
  id: string;
  returnTo?: string;
  presentation?: "page" | "modal";
  children: ReactNode;
}) {
  return (
    <CardDetailArtworkProvider id={id}>
      <CardDetailTransitionShell id={id} returnTo={returnTo} presentation={presentation}>
        {children}
      </CardDetailTransitionShell>
    </CardDetailArtworkProvider>
  );
}
