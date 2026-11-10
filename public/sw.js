// Podex service worker. It makes the site installable as an app; it deliberately caches
// nothing, so the catalog and prices are always fresh from the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
