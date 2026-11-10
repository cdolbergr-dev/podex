"use client";

import { PageContainer } from "@/components/page-container";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="pb-20">
      <PageContainer className="flex min-h-[50vh] flex-col justify-center">
        <h1 className="text-3xl font-medium tracking-tight">Something went wrong</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">This page could not be loaded.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-foreground px-4 text-sm text-surface"
        >
          Try again
        </button>
      </PageContainer>
    </main>
  );
}
