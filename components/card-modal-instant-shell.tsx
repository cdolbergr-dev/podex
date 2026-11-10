"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";
import { CardDetailTransitionLayout } from "@/components/card-detail-transition-layout";
import { CardModalOverlay } from "@/components/card-modal-overlay";
import { CardDetailInfoFallback } from "@/components/card-detail-info-fallback";

/** Shown the same frame the card route opens — keeps shared-element VT above the grid. */
export function CardModalInstantShell({
  cardId,
  preflight = false,
}: {
  cardId?: string;
  preflight?: boolean;
}) {
  const pathname = usePathname();
  const match = stripLocale(pathname).match(/^\/cards\/([^/]+)/);
  const id = cardId ?? (match ? decodeURIComponent(match[1]) : "");
  if (!id) return null;

  return (
    <CardModalOverlay cardId={id} preflight={preflight}>
      <CardDetailTransitionLayout id={id} presentation="modal">
        <CardDetailInfoFallback id={id} />
      </CardDetailTransitionLayout>
    </CardModalOverlay>
  );
}
