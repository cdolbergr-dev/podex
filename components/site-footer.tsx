import { brand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-xs leading-5 text-faint">
          {brand.name} uses the{" "}
          <a href="https://tcgdex.dev/" className="underline decoration-border underline-offset-2 hover:text-muted">
            TCGdex API
          </a>{" "}
          and shows card data for identification.
          Names, artwork, and game text remain the property of their rights holders.
        </p>
      </div>
    </footer>
  );
}
