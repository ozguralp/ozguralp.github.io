const CACHE_NAME = 'travel-notes-v12';
const STATIC_ASSETS = [
  './',
  './map.html',
  './places.html',
  './timeline.html',
  './ozgur-stars.html',
  './style.css',
  './app.js',
  './analytics.js',
  './data.json',
  './places.json',
  './stars.json',
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
  const requestUrl = new URL(e.request.url);
  const isLocalAsset = requestUrl.origin === self.location.origin;
  // Keep deploys fresh: all local HTML, JSON, JS and CSS are network-first.
  // External fonts and map libraries remain cache-first.
  if (isLocalAsset || e.request.mode === 'navigate') {
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
