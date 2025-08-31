
const CACHE_NAME = 'pm-poshan-tracker-cache-v2';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

// Install event: Caches the core application shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

// Activate event: Cleans up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Fetch event: Implements a robust cache-first, then network-fallback strategy.
// It also dynamically caches new assets as they are fetched from the network.
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network.
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response to cache.
          if (networkResponse && networkResponse.status === 200) {
            // Clone the response because it's a stream and can only be consumed once.
            const responseToCache = networkResponse.clone();
            // Cache the new response for future offline use.
            cache.put(event.request, responseToCache);
          }
          return networkResponse;
        });
      }).catch(error => {
        // This catch handles errors like being offline when a resource isn't cached.
        console.log('[Service Worker] Fetch failed; user is likely offline.', error);
      });
    })
  );
});
