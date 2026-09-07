// Service Worker: App-Shell offline verfügbar machen + Fremd-Assets zur Laufzeit cachen.
// Relative Pfade, damit es sowohl auf localhost (/) als auch auf GitHub Pages (/gym-tracker/) läuft.

const CACHE = 'gymtracker-v1';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './vendor/chart.umd.min.js',
  './src/main.js',
  './src/state.js',
  './src/sync.js',
  './src/auth.js',
  './src/utils.js',
  './src/whatsnew.js',
  './src/coach.js',
  './src/views/dashboard.js',
  './src/views/exercises.js',
  './src/views/log.js',
  './src/views/history.js',
  './src/views/progress.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Sync-Aufrufe niemals cachen -> immer ans Netz.
  if (url.hostname === 'api.github.com') return;

  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Eigene Dateien: network-first -> online immer aktuell, offline aus dem Cache.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Fremd-Assets (z.B. Google-Fonts): cache-first, ändern sich selten.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok || res.type === 'opaque') {
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
