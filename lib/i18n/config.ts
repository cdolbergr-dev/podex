/**
 * Languages. English is the default and keeps unprefixed URLs (/cards/…); the others live under
 * a prefix (/da/cards/…, /es/cards/…). The proxy rewrites unprefixed URLs to /en internally.
 */
export const LOCALES = ["en", "da", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Remembers an explicit language choice (set by the language picker). */
export const LOCALE_COOKIE = "podex_locale";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", da: "Dansk", es: "Español" };

/** BCP 47 tags for Intl formatting and hreflang. */
export const INTL_LOCALES: Record<Locale, string> = { en: "en-US", da: "da-DK", es: "es-ES" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** "/sets" → "/da/sets"; "/?q=x" → "/da?q=x"; English stays unprefixed. Only for site paths. */
export function localizePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE || !path.startsWith("/") || path.startsWith("//")) return path;
  if (splitLocalePath(path).locale !== DEFAULT_LOCALE) return path; // already prefixed
  if (path === "/") return `/${locale}`;
  if (path.startsWith("/?") || path.startsWith("/#")) return `/${locale}${path.slice(1)}`;
  return `/${locale}${path}`;
}

/** "/da/cards/x" → { locale: "da", path: "/cards/x" }; unprefixed paths are English. */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } {
  const match = pathname.match(/^\/(da|es)(?=$|[/?#])/);
  if (!match) return { locale: DEFAULT_LOCALE, path: pathname || "/" };
  const rest = pathname.slice(match[0].length);
  return { locale: match[1] as Locale, path: rest.startsWith("/") ? rest : `/${rest}` };
}

/** The route path without any language prefix (for route checks such as "is this a card page"). */
export function stripLocale(pathname: string): string {
  return splitLocalePath(pathname).path;
}
