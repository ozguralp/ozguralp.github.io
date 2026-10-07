const CACHE_NAME = 'travel-notes-v22';
const STATIC_ASSETS = [
  './',
  './map.html',
  './places.html',
  './favorites.html',
  './timeline.html',
  './ozgur-stars.html',
  './style.css?v=20',
  './app.js?v=20',
  './analytics.js',
  './navigation.js',
  './map-tiles.js',
  './data.json',
  './places.json',
  './favorites.json',
  './stars.json',
  './travel_history.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS.map(url => new Request(url, {cache: 'reload'}))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('travel-notes-') && k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const requestUrl = new URL(e.request.url);
  const isLocalAsset = requestUrl.origin === self.location.origin;
  if (e.request.method !== 'GET') return;
  // Keep deploys fresh: all local HTML, JSON, JS and CSS are network-first.
  // External fonts and map libraries remain cache-first.
  if (isLocalAsset || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, {cache: 'no-cache'}).then(r => {
        if (r.ok) {
          const clone = r.clone();
          e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone)));
        }
        return r;
      }).catch(async () => (await caches.match(e.request)) || Response.error())
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request))
    );
  }
});
