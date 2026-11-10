"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { brand } from "@/lib/brand";
import {
  appPlatform,
  canAddToHomeScreenOnIOS,
  isInstalledApp,
  isTouchDevice,
  rememberInstallPromptDismissed,
  wasInstallPromptDismissedRecently,
  type BeforeInstallPromptEvent,
} from "@/lib/install-app";

/** Give people a moment with the site before suggesting the app. */
const SHOW_AFTER_MS = 6000;

type Mode = "install" | "ios";

/**
 * Tells phone and tablet visitors they can add Podex to their home screen: a one-tap Install
 * where the browser supports it, Share → Add to Home Screen steps on iOS. Hidden once installed,
 * on desktop (browsers show their own install icon there) and for 30 days after "Not now".
 */
export function InstallAppPrompt() {
  const [mode, setMode] = useState<Mode | null>(null);
  const installEvent = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalledApp() || !isTouchDevice() || wasInstallPromptDismissedRecently()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const showLater = (next: Mode) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setMode(next);
        trackEvent("install-prompt-shown", { kind: next === "ios" ? "ios-steps" : "install-button", platform: appPlatform() });
      }, SHOW_AFTER_MS);
    };

    function onBeforeInstallPrompt(event: Event) {
      // Keep the browser's own mini-infobar from competing with ours.
      event.preventDefault();
      installEvent.current = event as BeforeInstallPromptEvent;
      showLater("install");
    }

    function onInstalled() {
      clearTimeout(timer);
      installEvent.current = null;
      setMode(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (canAddToHomeScreenOnIOS()) showLater("ios");

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    rememberInstallPromptDismissed();
    trackEvent("install-prompt-closed", { kind: mode === "ios" ? "ios-steps" : "install-button" });
    setMode(null);
  }

  async function install() {
    const event = installEvent.current;
    if (!event) return;
    installEvent.current = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    trackEvent(outcome === "accepted" ? "install-prompt-accepted" : "install-prompt-declined", {
      platform: appPlatform(),
    });
    if (outcome === "dismissed") rememberInstallPromptDismissed();
    setMode(null);
  }

  if (!mode) return null;

  return (
    <section
      aria-label={`Install the ${brand.name} app`}
      className="install-prompt-in fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-[0_24px_48px_-24px_rgba(28,25,23,0.5)]"
    >
      <div className="flex items-start gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny static app icon */}
        <img src="/icons/icon-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">Get the {brand.name} app</h2>
          {mode === "install" ? (
            <p className="mt-0.5 text-sm leading-5 text-muted">
              Add {brand.name} to your home screen for quick, full-screen browsing.
            </p>
          ) : (
            <p className="mt-0.5 text-sm leading-6 text-muted">
              Tap{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Share aria-hidden="true" className="size-3.5" />
                Share
              </span>
              , then{" "}
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <SquarePlus aria-hidden="true" className="size-3.5" />
                Add to Home Screen
              </span>
              .
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-background hover:text-foreground"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {mode === "install" ? (
        <div className="mt-3.5 flex justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-10 cursor-pointer items-center rounded-full px-4 text-sm text-muted hover:text-foreground"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={install}
            className="inline-flex h-10 cursor-pointer items-center rounded-full bg-foreground px-5 text-sm text-surface hover:opacity-90"
          >
            Install
          </button>
        </div>
      ) : null}
    </section>
  );
}
