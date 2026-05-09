// HarshAI+ v2.0 Enhanced Service Worker
const CACHE_NAME = 'harshai-v2.1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => 
            Promise.all(
                cacheNames.map(cacheName => 
                    cacheName !== CACHE_NAME && caches.delete(cacheName)
                )
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    if (event.request.destination === 'document' || 
        event.request.destination === 'style' || 
        event.request.destination === 'script' ||
        event.request.destination === 'font') {
        
        event.respondWith(
            caches.match(event.request)
                .then(cachedResponse => {
                    if (cachedResponse) return cachedResponse;
                    return fetch(event.request).then(networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }
                        return caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                            return networkResponse;
                        });
                    }).catch(() => {
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
                })
        );
    }
});