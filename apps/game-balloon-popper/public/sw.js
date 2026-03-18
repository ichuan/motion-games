// Service Worker: cache TF.js model files for fast subsequent loads
const CACHE_NAME = 'tfjs-model-v1';

// Cache any request to tfhub.dev or kaggle (model CDN)
const MODEL_HOSTS = ['tfhub.dev', 'www.kaggle.com', 'storage.googleapis.com'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const isModel = MODEL_HOSTS.some((h) => url.hostname.includes(h));
  if (!isModel) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(e.request);
      if (cached) return cached;
      const response = await fetch(e.request);
      if (response.ok) cache.put(e.request, response.clone());
      return response;
    }),
  );
});
