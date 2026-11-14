// Podex service worker. It makes the site installable as an app. It caches only the offline page
// (and its icon); the catalog and prices always come fresh from the network.
const CACHE = "podex-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Page loads go to the network as usual; only when that fails is the offline page shown.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // The offline page's icon, when the network is gone.
  if (new URL(request.url).pathname === "/icons/icon-192.png") {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
