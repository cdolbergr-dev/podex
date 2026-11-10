import Link from "next/link";
import { PageContainer } from "@/components/page-container";

export default function CardNotFound() {
  return (
    <main className="pb-20">
      <PageContainer className="flex min-h-[50vh] flex-col justify-center">
        <h1 className="text-3xl font-medium tracking-tight">Card not found</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">
          That card is not in the current catalog.
        </p>
        <Link href="/" className="mt-6 inline-flex h-11 w-fit items-center rounded-full bg-foreground px-4 text-sm text-surface">
          Back to explore
        </Link>
      </PageContainer>
    </main>
  );
}
