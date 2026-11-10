"use client";

import { useEffect } from "react";

/** Registers the (non-caching) service worker that makes the site installable. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Installability is a nicety; the site works without it.
    });
  }, []);

  return null;
}
