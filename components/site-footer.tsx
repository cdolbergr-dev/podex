import { brand } from "@/lib/brand";
import { getDictionary } from "@/lib/i18n/server";

export async function SiteFooter() {
  const t = await getDictionary();
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-xs leading-5 text-faint">
          {t.footer.before(brand.name)}{" "}
          <a href="https://tcgdex.dev/" className="underline decoration-border underline-offset-2 hover:text-muted">
            {t.footer.link}
          </a>{" "}
          {t.footer.after}
        </p>
      </div>
    </footer>
  );
}
