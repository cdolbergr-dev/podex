"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { clearCardOpenedFromGrid } from "@/lib/card-transition-pending";

/** While a card route is open, grid tiles must not use the same view-transition-name as the detail art. */
export function CardRouteEffects() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const match = pathname.match(/^\/cards\/([^/]+)/);
    if (!match) {
      delete document.body.dataset.openCard;
      return;
    }

    document.body.dataset.openCard = decodeURIComponent(match[1]);

    // Modal content streams in after the URL — wait a frame before treating this as full-page.
    const frame = requestAnimationFrame(() => {
      if (
        !document.querySelector(
          "[data-podex-card-modal], [data-podex-card-modal-preflight]",
        )
      ) {
        clearCardOpenedFromGrid();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
