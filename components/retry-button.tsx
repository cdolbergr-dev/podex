"use client";

import { useRouter } from "next/navigation";

export function RetryButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex h-11 items-center rounded-full bg-foreground px-4 text-sm text-surface"
    >
      {label}
    </button>
  );
}
