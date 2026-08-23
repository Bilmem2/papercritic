const CACHE = 'papercritic-mobile-v3.6';
const ASSETS = ['./index.html', './manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// API calls are intentionally handled by index.html through the Cloudflare Worker.
// This service worker is only responsible for caching the PWA shell.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin === self.location.origin && ASSETS.some(a => new URL(a, self.location).pathname === requestUrl.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
