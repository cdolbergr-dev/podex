"use client";

import { AlertTriangle, Check, ChevronDown, CloudOff, Link2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/favorites-provider";
import {
  BACKUP_CHANGE_EVENT,
  backupRestoreUrl,
  encodeFavoriteLists,
  fingerprintLists,
  readLastBackup,
  rememberBackup,
} from "@/lib/favorites-backup";
import { hasSevenDayStorageLimit, isInAppBrowser, isInstalledApp, isTouchDevice } from "@/lib/install-app";
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

function relativeDay(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(at);
}

/**
 * Explains where favorite lists live and what can remove them (tailored to the browser), and
 * offers a one-link backup of every list.
 */
export function FavoritesSafeguards() {
  const { lists, count } = useFavorites();
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
    const url = backupRestoreUrl(encoded);
    if (isTouchDevice() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Podex favorites backup", url });
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
      if (window.prompt("Copy this link and keep it somewhere safe:", url) !== null) rememberBackup(lists);
    }
  }

  const warning =
    environment.kind === "in-app"
      ? "You’re in an app’s built-in browser, which may not keep your lists. Open Podex in Safari or Chrome to keep them."
      : environment.kind === "seven-day"
        ? "This browser can clear your lists if you don’t visit Podex for 7 days. Podex keeps a copy and restores them when you’re back, unless you clear your cookies."
        : null;

  return (
    <section aria-label="How your favorites are saved" className="mt-6 rounded-2xl border border-border bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          {warning ? (
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-heart" />
          ) : (
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
          )}
          <div className="min-w-0 text-sm leading-6">
            <p>
              {environment.kind === "installed"
                ? "Saved in the Podex app on this device — no account needed."
                : "Saved in this browser on this device — no account needed."}
            </p>
            {warning ? <p className="text-muted">{warning}</p> : null}
            <p className="text-faint">
              {lastBackup ? (
                <>
                  Last backup {relativeDay(lastBackup.at)}
                  {outOfDate ? " · you’ve made changes since" : ""}
                </>
              ) : count > 0 ? (
                "Not backed up yet"
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
              {status === "copied" ? "Backup link copied" : status === "shared" ? "Backup shared" : "Back up all lists"}
            </span>
          </button>
        ) : null}
      </div>

      <HowSavingWorks environment={environment} />
    </section>
  );
}

function HowSavingWorks({ environment }: { environment: Environment }) {
  return (
    <details className="group mt-2 pl-7 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
        How saving works
        <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="mt-2 max-w-2xl list-disc space-y-1.5 pl-4 leading-6 text-muted marker:text-faint">
        <li>
          Your lists are stored on this device, in this browser. They don’t sync to your other devices or browsers.
        </li>
        <li>Clearing cookies and site data for Podex removes them.</li>
        <li>Private and incognito windows forget them when you close the window.</li>
        {environment.kind === "seven-day" ? (
          <li>
            Safari, and every browser on iPhone and iPad, removes data from sites you haven’t visited for 7 days.
            Adding Podex to your Home Screen avoids this limit.
          </li>
        ) : null}
        <li>
          Podex also keeps a copy in a cookie on this device and puts your lists back automatically if the browser
          clears them on its own. Nothing is stored on our servers.
        </li>
        <li>
          “Back up all lists” gives you a link with every list in it. Keep it in your notes or email it to yourself —
          opening it on any device restores your lists.
        </li>
        <li className="list-none -ml-4 flex items-center gap-2 pt-1">
          {environment.persisted ? (
            <>
              <ShieldCheck aria-hidden="true" className="size-4 text-foreground" />
              This browser has agreed to keep Podex’s data when it needs to free up space.
            </>
          ) : (
            <>
              <CloudOff aria-hidden="true" className="size-4" />
              This browser may remove Podex’s data if your device runs low on space.
            </>
          )}
        </li>
      </ul>
    </details>
  );
}
