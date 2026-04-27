const CACHE = "trip-planner-v47";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./app.js",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./brand.svg",
  "./offline.html",
  "./js/api.js",
  "./js/aws-auth.js",
  "./js/aws-config.js",
  "./js/cloud-sync.js",
  "./js/constants.js",
  "./js/data.js",
  "./js/format.js",
  "./js/init.js",
  "./js/render-packing.js",
  "./js/render-shared.js",
  "./js/render-views.js",
  "./js/share.js",
  "./js/state.js",
  "./js/warnings.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.matchAll({ type: "window" })).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() =>
        caches.match("./offline.html")
      );
    })
  );
});
