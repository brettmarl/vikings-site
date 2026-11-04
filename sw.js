// Service worker: pages are network-first (so new scores show up right away),
// with a cached fallback for patchy island coverage. Hashed assets are cache-first.
const CACHE = 'vikings-v5';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Always from the network: these say whether a newer version exists.
  if (/\/(version|data)\.json$/.test(url.pathname)) return;
  const isPage = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
  if (isPage) {
    e.respondWith(
      // cache: 'no-cache' revalidates with the server, so a fresh deploy shows up
      // right away instead of after GitHub Pages' 10-minute browser cache.
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(new URL('./', self.registration.scope).href))),
    );
  } else {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
  }
});
