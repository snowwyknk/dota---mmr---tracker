const CACHE = 'mmr-offline-v1';
const FILES = [
    "/",
    "/assets/css/main.css",
    "/assets/images/dota-plus/bronze.png",
    "/assets/images/dota-plus/gold.png",
    "/assets/images/dota-plus/grandmaster.png",
    "/assets/images/dota-plus/master.png",
    "/assets/images/dota-plus/platinum.png",
    "/assets/images/dota-plus/silver.png",
    "/assets/images/rank-medals.png",
    "/assets/images/site-background.png",
    "/assets/images/titan.png",
    "/assets/js/app.js",
    "/assets/js/avatar.js",
    "/assets/js/feedback.js",
    "/assets/js/hero-profile.js",
    "/assets/js/hero-progression.js",
    "/assets/js/mmr-history.js",
    "/assets/vendor/bootstrap.min.css",
    "/icon-192.png",
    "/icon-32.png",
    "/icon-512.png",
    "/manifest.webmanifest",
    "/pwa.js"
];
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key.startsWith('mmr-offline-') && key !== CACHE) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    const path = url.pathname === '/index.html' ? '/' : url.pathname;
    if (!FILES.includes(path)) return;
    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response.ok || response.status < 500) return response;
        } catch {
            // The installed shell is available while the network is offline.
        }
        const cache = await caches.open(CACHE);
        return await cache.match(path) || Response.error();
    })());
});
