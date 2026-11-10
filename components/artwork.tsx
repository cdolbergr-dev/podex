"use client";

import Image from "next/image";
import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

type ArtworkProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Used for accessible labeling when illustration is missing. */
  fallback: string;
  /** Shared element name for View Transitions API (card grid → detail). */
  viewTransitionName?: string;
  /**
   * Grid tiles only. Tiles carry no view-transition-name of their own (every named tile would
   * paint above the modal mid-transition); card transitions name the one tile they morph.
   */
  cardId?: string;
  /** Already-loaded lower-res URL shown underneath until `src` finishes loading. */
  placeholderSrc?: string;
};

export function Artwork({
  src,
  alt,
  sizes,
  priority = false,
  fallback,
  viewTransitionName,
  cardId,
  placeholderSrc,
}: ArtworkProps) {
  const [failed, setFailed] = useState(src.length === 0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const showPlaceholder = Boolean(placeholderSrc) && loadedSrc !== src;
  const { t } = useI18n();
  const missingLabel = t.card.illustrationMissingLabel(fallback);
  const isGridTile = Boolean(cardId);

  return (
    <div
      data-podex-card-id={cardId}
      className="relative aspect-[63/88] overflow-hidden rounded-lg bg-art shadow-[0_1px_2px_rgba(28,25,23,0.06)] ring-1 ring-foreground/5"
      style={!isGridTile && viewTransitionName ? { viewTransitionName } : undefined}
    >
      {failed ? (
        <div
          role="img"
          aria-label={missingLabel}
          className="absolute inset-0 flex flex-col items-center justify-center bg-[linear-gradient(180deg,var(--panel)_0%,var(--skeleton)_100%)] px-4 py-6 text-center"
        >
          <p className="text-sm font-medium leading-5 text-soft">{t.card.illustrationMissing}</p>
          <p className="mt-1.5 max-w-[14rem] text-xs leading-5 text-muted">
            {t.card.illustrationMissingMessage}
          </p>
        </div>
      ) : (
        <>
          {placeholderSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- exact cached URL from the grid tile
            <img
              src={placeholderSrc}
              alt=""
              aria-hidden="true"
              decoding="sync"
              className="absolute inset-0 size-full object-contain"
            />
          ) : null}
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-contain ${placeholderSrc ? `transition-opacity duration-200 ${showPlaceholder ? "opacity-0" : "opacity-100"}` : ""}`}
            onLoad={() => setLoadedSrc(src)}
            onError={() => setFailed(true)}
          />
        </>
      )}
    </div>
  );
}
