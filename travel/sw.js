const CACHE_NAME = 'travel-notes-v1';
const STATIC_ASSETS = [
  './',
  './style.css',
  './app.js',
  './data.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for HTML, cache-first for static assets
  if (e.request.url.includes('/posts/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
