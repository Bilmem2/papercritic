const CACHE = 'papercritic-mobile-v3.5';
const ASSETS = ['./index.html', './manifest.webmanifest'];
const OLLAMA_API_ORIGIN = 'https://ollama.com';
const OLLAMA_PROXY_ORIGIN = 'https://papercritic-ollama.can-sevilmis.workers.dev';

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

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin === self.location.origin && ASSETS.some(a => new URL(a, self.location).pathname === requestUrl.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
    return;
  }

  // Safety net for any legacy frontend code that still targets ollama.com/api/*.
  // All browser Ollama traffic is sent through the Cloudflare Worker so mobile
  // browsers never have to perform a cross-origin request to ollama.com.
  if (requestUrl.origin === OLLAMA_API_ORIGIN && requestUrl.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const proxyUrl = new URL(requestUrl.pathname + requestUrl.search, OLLAMA_PROXY_ORIGIN);
      const headers = new Headers(event.request.headers);
      const proxyRequest = new Request(proxyUrl.toString(), {
        method: event.request.method,
        headers,
        body: event.request.method === 'GET' || event.request.method === 'HEAD' ? undefined : event.request.body,
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
      });

      try {
        return await fetch(proxyRequest);
      } catch (error) {
        return new Response(JSON.stringify({
          error: 'PaperCritic Ollama proxy request failed.',
          details: String(error),
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
    })());
  }
});
