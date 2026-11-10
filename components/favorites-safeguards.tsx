"use client";

import { AlertTriangle, Check, ChevronDown, CloudOff, Link2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/favorites-provider";
import { useI18n } from "@/components/i18n-provider";
import {
  BACKUP_CHANGE_EVENT,
  backupRestoreUrl,
  encodeFavoriteLists,
  fingerprintLists,
  readLastBackup,
  rememberBackup,
} from "@/lib/favorites-backup";
import { hasSevenDayStorageLimit, isInAppBrowser, isInstalledApp, isTouchDevice } from "@/lib/install-app";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { isStoragePersisted } from "@/lib/storage-persistence";

type Environment = {
  kind: "in-app" | "seven-day" | "installed" | "standard";
  persisted: boolean;
};

const subscribeBackup = (onChange: () => void) => {
  window.addEventListener(BACKUP_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(BACKUP_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const lastBackupSnapshot = () => JSON.stringify(readLastBackup());

function relativeDay(at: number, t: Dictionary, locale: Locale): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return t.safeguards.today;
  if (days === 1) return t.safeguards.yesterday;
  if (days < 30) return t.safeguards.daysAgo(days);
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], { month: "short", day: "numeric", year: "numeric" }).format(at);
}

/**
 * Explains where favorite lists live and what can remove them (tailored to the browser), and
 * offers a one-link backup of every list.
 */
export function FavoritesSafeguards() {
  const { lists, count } = useFavorites();
  const { locale, t, href } = useI18n();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [encoded, setEncoded] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const lastBackup = JSON.parse(useSyncExternalStore(subscribeBackup, lastBackupSnapshot, () => "null")) as ReturnType<
    typeof readLastBackup
  >;

  useEffect(() => {
    let cancelled = false;
    void isStoragePersisted().then((persisted) => {
      if (cancelled) return;
      const kind = isInAppBrowser()
        ? "in-app"
        : isInstalledApp()
          ? "installed"
          : hasSevenDayStorageLimit()
            ? "seven-day"
            : "standard";
      setEnvironment({ kind, persisted });
    });
    return () => {
      cancelled = true;
    };
  }, [count]);

  // Prepared ahead of the click: Safari only allows sharing/copying during the click itself.
  useEffect(() => {
    let cancelled = false;
    void encodeFavoriteLists(lists).then((value) => {
      if (!cancelled) setEncoded(value);
    });
    return () => {
      cancelled = true;
    };
  }, [lists]);

  useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  if (!environment) return null;

  const outOfDate = lastBackup !== null && lastBackup.fingerprint !== fingerprintLists(lists);

  async function backUp() {
    if (!encoded) return;
    const url = backupRestoreUrl(encoded, href("/favorites/restore"));
    if (isTouchDevice() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: t.safeguards.backupShareTitle, url });
        rememberBackup(lists);
        setStatus("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      rememberBackup(lists);
      setStatus("copied");
    } catch {
      if (window.prompt(t.safeguards.backupPrompt, url) !== null) rememberBackup(lists);
    }
  }

  const warning =
    environment.kind === "in-app"
      ? t.safeguards.inAppWarning
      : environment.kind === "seven-day"
        ? t.safeguards.sevenDayWarning
        : null;

  return (
    <section aria-label={t.safeguards.region} className="mt-6 rounded-2xl border border-border bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          {warning ? (
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-heart" />
          ) : (
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          )}
          <div className="min-w-0 text-sm leading-6">
            <p>
              {environment.kind === "installed" ? t.safeguards.savedInApp : t.safeguards.savedHere}
            </p>
            {warning ? <p className="text-muted">{warning}</p> : null}
            <p className="text-faint">
              {lastBackup ? (
                <>
                  {t.safeguards.lastBackup(relativeDay(lastBackup.at, t, locale))}
                  {outOfDate ? t.safeguards.changedSince : ""}
                </>
              ) : count > 0 ? (
                t.safeguards.notBackedUp
              ) : null}
            </p>
          </div>
        </div>
        {count > 0 ? (
          <button
            type="button"
            onClick={backUp}
            disabled={!encoded}
            className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm hover:bg-surface-hover disabled:cursor-default"
          >
            {status === "idle" ? (
              <Link2 aria-hidden="true" className="size-4" />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            <span aria-live="polite">
              {status === "copied"
                ? t.safeguards.backupCopied
                : status === "shared"
                  ? t.safeguards.backupShared
                  : t.safeguards.backUp}
            </span>
          </button>
        ) : null}
      </div>

      <HowSavingWorks environment={environment} t={t} />
    </section>
  );
}

function HowSavingWorks({ environment, t }: { environment: Environment; t: Dictionary }) {
  return (
    <details className="group mt-2 pl-7 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        {t.safeguards.howItWorks}
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 max-w-2xl list-disc space-y-1.5 pl-4 leading-6 text-muted marker:text-faint">
        <li>{t.safeguards.pointDevice}</li>
        <li>{t.safeguards.pointClearing}</li>
        <li>{t.safeguards.pointPrivate}</li>
        {environment.kind === "seven-day" ? <li>{t.safeguards.pointSevenDay}</li> : null}
        <li>{t.safeguards.pointCopy}</li>
        <li>{t.safeguards.pointBackup}</li>
        <li className="list-none -ml-4 flex items-center gap-2 pt-1">
          {environment.persisted ? (
            <>
              <ShieldCheck aria-hidden="true" className="size-4 text-foreground" />
              {t.safeguards.persisted}
            </>
          ) : (
            <>
              <CloudOff aria-hidden="true" className="size-4" />
              {t.safeguards.notPersisted}
            </>
          )}
        </li>
      </ul>
    </details>
  );
}
