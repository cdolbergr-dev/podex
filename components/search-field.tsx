"use client";

import { useI18n, useLocaleRouter } from "@/components/i18n-provider";
import { Clock, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buildExploreHref } from "@/lib/explore-params";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "@/lib/recent-searches";
import { DEFAULT_PAGE_SIZE, DEFAULT_SORT } from "@/lib/tcg/constants";
import type { ExploreParams } from "@/types/catalog";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function SearchField({ params }: { params: ExploreParams }) {
  const router = useLocaleRouter();
  const { t, href } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(params.q);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (document.activeElement === inputRef.current) return;
    setValue(params.q);
  }, [params.q]);

  useEffect(() => {
    if (value === params.q) return;
    const timeout = window.setTimeout(() => {
      router.replace(buildExploreHref(params, { q: value, page: 1 }), { scroll: false });
    }, 280);
    return () => window.clearTimeout(timeout);
  }, [params, router, value]);

  // "/" or ⌘K / Ctrl+K focuses search from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const shortcut =
        (event.key === "/" && !isTypingTarget(event.target)) ||
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
      if (!shortcut || document.querySelector("[data-podex-card-modal], [data-podex-card-modal-preflight]")) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function search(query: string) {
    setValue(query);
    router.replace(buildExploreHref(params, { q: query, page: 1 }), { scroll: false });
  }

  function clear() {
    search("");
    inputRef.current?.focus();
  }

  const showRecent = focused && value === "" && recent.length > 0;

  return (
    <form
      role="search"
      action={href("/")}
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        setRecent(rememberSearch(value));
        search(value);
      }}
    >
      {params.set ? <input type="hidden" name="set" value={params.set} /> : null}
      {params.type ? <input type="hidden" name="type" value={params.type} /> : null}
      {params.rarity ? <input type="hidden" name="rarity" value={params.rarity} /> : null}
      {params.sort !== DEFAULT_SORT ? <input type="hidden" name="sort" value={params.sort} /> : null}
      {params.pageSize !== DEFAULT_PAGE_SIZE ? <input type="hidden" name="per" value={params.pageSize} /> : null}
      <label htmlFor="card-search" className="sr-only">
        {t.explore.searchLabel}
      </label>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          id="card-search"
          name="q"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => {
            setRecent(readRecentSearches());
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
            setRecent(rememberSearch(value));
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") inputRef.current?.blur();
          }}
          placeholder={t.explore.searchPlaceholder}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-controls={showRecent ? "recent-searches" : undefined}
          className="h-12 w-full rounded-full border border-border bg-surface pr-12 pl-11 text-base text-foreground shadow-[0_1px_2px_rgba(28,25,23,0.03)] placeholder:text-faint"
        />
        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label={t.explore.clearSearch}
            className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-md border border-border px-1.5 font-sans text-xs leading-5 text-faint [@media(hover:hover)]:block"
          >
            /
          </kbd>
        )}

        {showRecent ? (
          <div
            id="recent-searches"
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-surface py-1.5 shadow-[0_16px_40px_-24px_rgba(28,25,23,0.45)]"
            // Keep focus in the input so a click lands before blur hides the list.
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="flex items-center justify-between px-4 pt-1 pb-1.5 text-xs text-faint">
              <span>{t.explore.recent}</span>
              <button
                type="button"
                onClick={() => {
                  clearRecentSearches();
                  setRecent([]);
                }}
                className="cursor-pointer hover:text-foreground"
              >
                {t.common.clear}
              </button>
            </div>
            <ul>
              {recent.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => {
                      setRecent(rememberSearch(item));
                      search(item);
                      inputRef.current?.blur();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm hover:bg-background"
                  >
                    <Clock aria-hidden="true" className="size-3.5 text-faint" />
                    <span className="truncate">{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </form>
  );
}
