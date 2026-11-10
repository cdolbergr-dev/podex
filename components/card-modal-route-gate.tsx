"use client";

import { usePathname } from "next/navigation";
import { stripLocale } from "@/lib/i18n/config";
import type { ReactNode } from "react";
import { useCardOpen } from "@/components/card-open-context";

/** Avoid two modals (and duplicate view-transition-names) while preflight owns the open morph. */
export function CardModalRouteGate({ children }: { children: ReactNode }) {
  const { preflightCardId, morphing } = useCardOpen();
  const pathname = usePathname();
  const match = stripLocale(pathname).match(/^\/cards\/([^/]+)/);
  const routeCardId = match ? decodeURIComponent(match[1]) : "";

  // Mounting mid-morph would yank the live "new" snapshot; hand off once the morph ends.
  if (morphing && preflightCardId && routeCardId === preflightCardId) {
    return null;
  }

  return children;
}
