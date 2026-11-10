"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";
import { brand } from "@/lib/brand";

const SavedCount = dynamic(() => import("@/components/saved-count").then((mod) => mod.SavedCount), {
  ssr: false,
});

const LINKS = [
  { href: "/", label: "Explore" },
  { href: "/sets", label: "Sets" },
  { href: "/favorites", label: "Favorites" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const menuId = useId();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5 text-foreground" aria-label={`${brand.name} home`}>
          <LogoMark />
          <span className="text-base font-medium tracking-tight">{brand.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.href} href={link.href} pathname={pathname} />
          ))}
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-hover md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      {open ? (
        <nav id={menuId} aria-label="Mobile" className="border-t border-border px-4 py-3 md:hidden">
          <ul className="grid gap-1">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-11 items-center justify-between rounded-lg px-3 text-sm ${
                      active ? "bg-surface-hover text-foreground" : "text-muted"
                    }`}
                  >
                    {link.label}
                    {link.href === "/favorites" ? <SavedCount variant="text" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function NavLink({ href, pathname }: { href: string; pathname: string }) {
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-10 items-center rounded-full px-3 text-sm transition-colors ${
        active ? "text-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {href === "/favorites" ? "Favorites" : href === "/sets" ? "Sets" : "Explore"}
      {href === "/favorites" ? <SavedCount /> : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderFallback() {
  return (
    <div className="sticky top-0 z-40 h-16 border-b border-border/80 bg-background/85" aria-hidden="true" />
  );
}
