import type { Metadata } from "next";
import { LOCALES, localizePath, type Locale } from "@/lib/i18n/config";

/**
 * canonical + hreflang links for a page that exists in every language. `path` is the
 * unprefixed (English) site path, e.g. "/sets" or "/cards/base1-4".
 */
export function languageAlternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = { "x-default": path };
  for (const each of LOCALES) languages[each] = localizePath(each, path);
  return { canonical: localizePath(locale, path), languages };
}
