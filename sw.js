// Service worker : met l'application en cache pour qu'elle fonctionne même sans réseau
// (utile dans une salle de formation avec un Wi-Fi capricieux).
// Incrémenter VERSION à chaque modification des fichiers pour forcer la mise à jour.
const VERSION = "v5";
const ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/game.js",
  "js/cards.js",
  "manifest.webmanifest",
  "icons/icon.svg",
  "img/dos/regle-1.webp",
  "img/dos/regle-2.webp",
  "img/dos/regle-3.webp",
  "img/dos/regle-4.webp",
  "img/dos/regle-5.webp",
  "img/dos/regle-6.webp",
  "img/dos/regle-7.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour récupérer les mises à jour), cache en secours.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
