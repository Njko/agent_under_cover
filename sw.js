// Service worker : met l'application en cache pour qu'elle fonctionne même sans réseau
// (utile dans une salle de formation avec un Wi-Fi capricieux).
// Incrémenter VERSION à chaque modification des fichiers pour forcer la mise à jour.
const VERSION = "v17";
// Seul le cœur de l'application est préchargé ; les images sont mises en cache à la première
// utilisation (le mode low-tech n'en télécharge presque aucune).
const ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "js/boot.js",
  "js/app.js",
  "js/game.js",
  "js/cards.js",
  "js/icons.js",
  "manifest.webmanifest",
  "icons/icon.svg",
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
  // Seules les requêtes GET vers ce site sont gérées : le service worker ne contacte aucun autre domaine.
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    // « no-cache » revalide auprès du serveur : évite de servir un ancien fichier depuis le cache HTTP.
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
