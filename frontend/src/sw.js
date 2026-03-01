/* eslint-disable no-restricted-globals */

// Манифест от Vite
const manifestAssets = self.__WB_MANIFEST || [];

// Исправляем формирование путей: добавляем префикс '/', если его нет
let coreUrls = manifestAssets.map(entry => {
    const url = typeof entry === 'string' ? entry : entry.url;
    return url.startsWith('/') ? url : `/${url}`;
});

// Базовые пути для SPA
if (!coreUrls.includes('/')) coreUrls.push('/');

coreUrls = [...new Set(coreUrls)];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name.includes('workbox-precache') ||
                            (name.includes('lab-core') && name !== 'lab-core-cache');
                    })
                    .map((name) => {
                        console.log('[PWA SW] Авто-удаление старого кэша:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// 1. УЛУЧШЕННЫЙ ЗАГРУЗЧИК
self.addEventListener('message', async (event) => {
    if (!event.data) return;

    if (event.data.type === 'CACHE_LAB') {
        await caches.delete('lab-core-cache');

        console.log('[PWA SW] Начало загрузки. Файлов в очереди:', coreUrls.length);

        try {
            const cache = await caches.open('lab-core-cache');
            let cachedCount = 0;

            for (const url of coreUrls) {
                try {
                    // Используем { cache: 'reload' } чтобы гарантированно взять свежее с сервера
                    const response = await fetch(new Request(url, { cache: 'reload' }));

                    if (response.ok) {
                        await cache.put(url, response);
                        cachedCount++;
                        // Логируем прогресс в консоль (увидишь в DevTools)
                        if (cachedCount % 5 === 0) console.log(`[PWA SW] Загружено ${cachedCount} файлов...`);
                    } else {
                        console.error(`[PWA SW] Ошибка ${response.status} при загрузке: ${url}`);
                    }
                } catch (err) {
                    console.error(`[PWA SW] Не удалось скачать: ${url}`, err);
                }
            }

            if (cachedCount > 0) {
                console.log(`[PWA SW] Загрузка завершена! Всего файлов в кэше: ${cachedCount}`);
                event.source.postMessage({ type: 'LAB_CACHED_SUCCESS' });
            } else {
                throw new Error("Ни один файл не был сохранен.");
            }
        } catch (err) {
            console.error('[PWA SW] Критическая ошибка загрузки:', err);
            event.source.postMessage({ type: 'LAB_CACHED_ERROR', error: err.message });
        }
    }

    if (event.data.type === 'CLEAR_LAB_CACHE') {
        console.log('[PWA SW] Очистка всех системных кэшей...');
        const names = await caches.keys();
        await Promise.all(
            names.filter(n => n.includes('lab-core')).map(n => caches.delete(n))
        );
        console.log('[PWA SW] Кэш полностью удален');
        event.source.postMessage({ type: 'LAB_CLEARED_SUCCESS' });
    }
});

// 2. ПЕРЕХВАТЧИК
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Исключаем API и SignalR из кэширования воркером
    if (url.pathname.startsWith('/hub') || url.pathname.startsWith('/api')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            // Если файл есть в кэше — отдаем, иначе идем в сеть
            return cached || fetch(event.request).catch(() => {
                // Если сети нет и это навигация — отдаем index.html (SPA)
                if (event.request.mode === 'navigate') {
                    return caches.match('/');
                }
                return new Response("Offline", { status: 503 });
            });
        })
    );
});