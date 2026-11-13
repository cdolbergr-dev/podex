"use client";

import { useI18n, useLocaleRouter } from "@/components/i18n-provider";
import { Suspense, type MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
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

function CardDetailBackFromUrl({ cardId }: { cardId: string }) {
  return <CardDetailBack returnTo={useSearchParams().get("return") ?? undefined} cardId={cardId} />;
}

/**
 * The full card page's back link reads "?return=" in the browser, so the server render doesn't
 * depend on the query string and the page can stay cached at the CDN. Until it's read, the link
 * points to the start page.
 */
export function CardDetailBackFromSearch({ cardId }: { cardId: string }) {
  return (
    <Suspense fallback={<CardDetailBack cardId={cardId} />}>
      <CardDetailBackFromUrl cardId={cardId} />
    </Suspense>
  );
}
