"use client";

import { useEffect } from "react";

/** Registers the service worker that makes the site installable and shows an offline page. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Installability is a nicety; the site works without it.
    });
  }, []);

  return null;
}
