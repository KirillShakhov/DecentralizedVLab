import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (url.pathname.includes('/compilers/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Жесткий Cache-First: если есть кэш - отдаем его. 
                if (cachedResponse) return cachedResponse;

                // Если нет - грузим из сети, НО НЕ СОХРАНЯЕМ в кэш
                return fetch(event.request);
            })
        );
    }
});