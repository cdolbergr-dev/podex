"use client";

import { useI18n, useLocaleRouter } from "@/components/i18n-provider";
import type { MouseEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useCardOpen } from "@/components/card-open-context";
import { runCardCloseNavigation } from "@/lib/card-transition-nav";
import { returnLabel, safeReturnPath } from "@/lib/explore-params";

export function CardDetailBack({ returnTo, cardId }: { returnTo?: string; cardId: string }) {
  const router = useLocaleRouter();
  const { t, href } = useI18n();
  const { endCardOpen } = useCardOpen();
  const back = safeReturnPath(returnTo);

  function close(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    runCardCloseNavigation(router, back, cardId, endCardOpen);
  }

  return (
    <a
      href={href(back)}
      onClick={close}
      className="inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {returnLabel(back, t)}
    </a>
  );
}
