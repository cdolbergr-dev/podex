export function CardSkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div role="status" className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <span className="sr-only">Loading cards</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden="true">
          <div className="aspect-[63/88] animate-pulse rounded-lg bg-skeleton" />
          <div className="mt-3 h-3 w-3/4 animate-pulse rounded-full bg-skeleton" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-skeleton-soft" />
        </div>
      ))}
    </div>
  );
}

export function ExploreFallback() {
  return (
    <div className="min-w-0">
      <div className="h-12 w-full animate-pulse rounded-full bg-skeleton" />
      <div className="mt-6 h-11 w-36 animate-pulse rounded-full bg-skeleton-soft" />
      <div className="mt-8 h-5 w-24 animate-pulse rounded-full bg-skeleton-soft" />
      <div className="mt-5">
        <CardSkeletonGrid />
      </div>
    </div>
  );
}

export function DetailFallback() {
  return (
    <div role="status" className="grid gap-10 lg:grid-cols-[minmax(280px,420px)_minmax(0,1fr)] lg:gap-16">
      <span className="sr-only">Loading card</span>
      <div className="aspect-[63/88] animate-pulse rounded-lg bg-skeleton" />
      <div className="space-y-4 pt-2">
        <div className="h-4 w-32 animate-pulse rounded-full bg-skeleton-soft" />
        <div className="h-10 w-2/3 animate-pulse rounded-full bg-skeleton" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-skeleton-soft" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-skeleton-soft" />
      </div>
    </div>
  );
}

/** Right column only — artwork lives in {@link CardDetailTransitionLayout}. Top rows match the subtitle + title in CardDetail. */
export function DetailInfoFallback() {
  return (
    <div role="status">
      <span className="sr-only">Loading card details</span>
      <div className="h-5 w-32 animate-pulse rounded-full bg-skeleton-soft" />
      <div className="mt-2 h-12 w-2/3 animate-pulse rounded-full bg-skeleton" />
      <div className="mt-5 h-4 w-1/2 animate-pulse rounded-full bg-skeleton-soft" />
      <div className="mt-8 h-24 w-full animate-pulse rounded-xl bg-skeleton-soft" />
    </div>
  );
}

export function SetsFallback() {
  return (
    <div role="status" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <span className="sr-only">Loading sets</span>
      {Array.from({ length: 9 }, (_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-xl bg-skeleton" />
      ))}
    </div>
  );
}
