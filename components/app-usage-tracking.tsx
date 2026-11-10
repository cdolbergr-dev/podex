"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import { appPlatform, isInstalledApp } from "@/lib/install-app";

const FIRST_LAUNCH_KEY = "podex.appLaunched";

/**
 * App analytics that don't depend on the install notice:
 * - "app-installed": the browser installed Podex (Chrome/Edge/Samsung, any install route).
 * - "app-first-open": first launch from the home screen on this device. iOS gives websites no
 *   install signal, so this is the closest thing to an iPhone/iPad install count.
 * - "app-open": every launch in app (standalone) mode.
 */
export function AppUsageTracking() {
  useEffect(() => {
    const onInstalled = () => trackEvent("app-installed", { platform: appPlatform() });
    window.addEventListener("appinstalled", onInstalled);

    if (isInstalledApp()) {
      const platform = appPlatform();
      trackEvent("app-open", { platform });
      try {
        if (!window.localStorage.getItem(FIRST_LAUNCH_KEY)) {
          window.localStorage.setItem(FIRST_LAUNCH_KEY, new Date().toISOString());
          trackEvent("app-first-open", { platform });
        }
      } catch {
        // Storage blocked: skip the first-launch event rather than over-count.
      }
    }

    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
