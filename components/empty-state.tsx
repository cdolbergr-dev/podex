"use client";

import { LocaleLink, useI18n } from "@/components/i18n-provider";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{message}</p>
      {actionHref && actionLabel ? (
        <LocaleLink
          href={actionHref}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface"
        >
          {actionLabel}
        </LocaleLink>
      ) : null}
    </div>
  );
}

export function ErrorPanel({ message, action }: { message: string; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
      <h2 className="text-lg font-medium tracking-tight">{t.errors.couldntLoadCards}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{message}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
