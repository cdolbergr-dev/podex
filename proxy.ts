import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/** Best supported language from an Accept-Language header (English when nothing matches). */
function preferredLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { language: tag.split("-")[0], q: Number.isFinite(q) ? q : 0 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { language, q } of ranked) {
    if (q > 0 && isLocale(language)) return language;
  }
  return DEFAULT_LOCALE;
}

/**
 * Language routing. Pages live under app/[lang]; English keeps unprefixed URLs (rewritten to
 * /en internally), Danish and Spanish use /da and /es. "/en/…" redirects to the unprefixed URL.
 * Only the start page redirects by preference: a saved choice (cookie) or, on a first visit,
 * the browser's languages. Crawlers send no preference and get English.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const { pathname } = url;

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const target = url.clone();
    target.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(target, 308);
  }

  if (/^\/(da|es)(\/|$)/.test(pathname)) return NextResponse.next();

  if (pathname === "/") {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved) ? saved : preferredLocale(request.headers.get("accept-language"));
    if (locale !== DEFAULT_LOCALE) {
      const target = url.clone();
      target.pathname = `/${locale}`;
      return NextResponse.redirect(target, 307);
    }
  }

  const target = url.clone();
  target.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(target);
}

export const config = {
  // Everything except Next internals, API routes, root metadata/static files and static assets.
  // (Card ids can contain dots, e.g. sv03.5-199, so only real asset extensions are skipped.)
  matcher: [
    "/((?!_next/|api/|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|sw\\.js|icons/|favicon\\.ico|icon\\.svg|apple-icon\\.png|.*\\.(?:png|jpe?g|gif|svg|webp|ico|txt|xml|js|css|map|json|woff2?)$).*)",
  ],
};
