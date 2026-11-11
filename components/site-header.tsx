"use client";

import dynamic from "next/dynamic";
import { Globe, Menu, X } from "lucide-react";
import { useId, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LocaleLink, useI18n } from "@/components/i18n-provider";
import { LogoMark } from "@/components/logo-mark";
import { brand } from "@/lib/brand";
import {
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALES,
  isLocale,
  localizePath,
  stripLocale,
  type Locale,
} from "@/lib/i18n/config";

const SavedCount = dynamic(() => import("@/components/saved-count").then((mod) => mod.SavedCount), {
  ssr: false,
});

const LINKS = [
  { href: "/", key: "explore" },
  { href: "/pokemon", key: "pokemon" },
  { href: "/sets", key: "sets" },
  { href: "/artists", key: "artists" },
  { href: "/favorites", key: "favorites" },
] as const;

export function SiteHeader() {
  const fullPathname = usePathname();
  const pathname = stripLocale(fullPathname);
  const { t } = useI18n();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === fullPathname;
  const menuId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <LocaleLink href="/" className="inline-flex items-center gap-2.5 text-foreground" aria-label={t.nav.home(brand.name)}>
          <LogoMark />
          <span className="text-base font-medium tracking-tight">{brand.name}</span>
        </LocaleLink>

        <div className="hidden items-center gap-1 md:flex">
          <nav aria-label={t.nav.primary} className="flex items-center gap-1">
            {LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={t.nav[link.key]} pathname={pathname} />
            ))}
          </nav>
          <LanguagePicker />
        </div>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpenPath(open ? null : fullPathname)}
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          <span className="sr-only">{open ? t.nav.closeMenu : t.nav.openMenu}</span>
        </button>
      </div>

      {open ? (
        <nav id={menuId} aria-label={t.nav.mobile} className="border-t border-border px-4 py-3 md:hidden">
          <ul className="grid gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <LocaleLink
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center justify-between rounded-lg px-3 text-sm ${
                      active ? "bg-surface-hover text-foreground" : "text-muted"
                    }`}
                  >
                    {t.nav[link.key]}
                    {link.href === "/favorites" ? <SavedCount variant="text" /> : null}
                  </LocaleLink>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-border px-3 pt-3">
            <LanguagePicker />
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isActive(pathname, href);

  return (
    <LocaleLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-full px-3 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {label}
      {href === "/favorites" ? <SavedCount /> : null}
    </LocaleLink>
  );
}

/** Remembers the choice in a cookie (read by proxy.ts on "/") and reloads the same page in that language. */
function LanguagePicker() {
  const { locale, t } = useI18n();
  const router = useRouter();

  function change(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    const { pathname, search } = window.location;
    router.push(`${localizePath(next, stripLocale(pathname))}${search}`);
  }

  return (
    <label className="relative inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:text-foreground">
      <Globe aria-hidden="true" className="size-4" />
      <span className="sr-only">{t.nav.language}</span>
      <select
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) change(event.target.value);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-sm outline-none"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </label>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // "My collection" sits beside favorites (tabs), so it highlights Favorites.
  if (href === "/favorites" && pathname.startsWith("/collection")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-border/80 bg-background/85" aria-hidden="true" />
  );
}
