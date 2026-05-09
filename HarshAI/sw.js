// HarshAI+ Service Worker for PWA Offline Support
const CACHE_NAME = 'aichat-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

// Install event - cache core files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching core files');
                return cache.addAll(urlsToCache);
            })
    );
    
    // Force activation of new service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - serve cached files offline
self.addEventListener('fetch', event => {
    // Only cache HTML, CSS, JS
    if (event.request.destination === 'document' || 
        event.request.destination === 'style' || 
        event.request.destination === 'script') {
        
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    // Return cached version or fetch from network
                    return response || fetch(event.request).catch(() => {
                        // If offline and no cache, show offline page for HTML
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
                })
        );
    }
});

// Handle background sync (optional)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-chats') {
        event.waitUntil(syncChats());
    }
});

function syncChats() {
    // Placeholder for chat sync functionality
    console.log('Background sync triggered');
}