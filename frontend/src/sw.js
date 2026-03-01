import { precacheAndRoute } from 'workbox-precaching';

// VitePWA сам подставит сюда список файлов для кэширования (React, CSS, иконки)
precacheAndRoute(self.__WB_MANIFEST);

// Перехватчик запросов (Fetch Listener)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Если запрос идет к любому компилятору в папке /compilers/
    if (url.pathname.includes('/compilers/')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Если пользователь нажал кнопку "Скачать", файл будет в кэше — отдаем его
                if (cachedResponse) {
                    console.log('[PWA SW] Отдаю из кэша:', url.pathname);
                    return cachedResponse;
                }

                // Если в кэше нет — просто идем в сеть, НО НЕ СОХРАНЯЕМ автоматически
                return fetch(event.request);
            })
        );
    }
});