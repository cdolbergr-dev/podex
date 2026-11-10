"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export function RetryButton({ label }: { label?: string }) {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface"
    >
      {label ?? t.common.tryAgain}
    </button>
  );
}
