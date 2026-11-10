"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, type ComponentProps, type ReactNode } from "react";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { DEFAULT_LIST_NAME } from "@/lib/favorites-storage";
import { formatCount, formatReleaseDate } from "@/lib/format";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Current language, its dictionary and helpers for Client Components. */
export function useI18n() {
  const locale = useContext(LocaleContext);
  return useMemo(
    () => ({
      locale,
      t: dictionaries[locale],
      /** Site path in the current language ("/sets" → "/da/sets"). */
      href: (path: string) => localizePath(locale, path),
      formatNumber: (value: number) => formatCount(value, locale),
      formatDate: (value: string | undefined) => formatReleaseDate(value, locale),
      /** Lists keep the English default name in storage; show it in the current language. */
      listName: (name: string) => (name === DEFAULT_LIST_NAME ? dictionaries[locale].favorites.defaultListName : name),
    }),
    [locale],
  );
}

/** next/link that keeps the visitor in their language. Pass site paths without a prefix. */
export function LocaleLink({ href, ...props }: ComponentProps<typeof Link>) {
  const { href: localize } = useI18n();
  return <Link href={typeof href === "string" ? localize(href) : href} {...props} />;
}

/** useRouter whose push/replace/prefetch add the current language prefix to site paths. */
export function useLocaleRouter() {
  const router = useRouter();
  const { href: localize } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string, options?: Parameters<typeof router.push>[1]) => router.push(localize(path), options),
      replace: (path: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localize(path), options),
      prefetch: (path: string, options?: Parameters<typeof router.prefetch>[1]) =>
        router.prefetch(localize(path), options),
    }),
    [router, localize],
  );
}
