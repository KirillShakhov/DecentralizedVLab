// Vite (Workbox) при сборке заменит `self.__WB_MANIFEST` на массив всех сгенерированных файлов (JS, CSS)
const manifestAssets = self.__WB_MANIFEST || [];

// ВАЖНО: Используем let, так как будем изменять массив
let coreUrls = manifestAssets.map(entry => typeof entry === 'string' ? entry : entry.url);

// Добавляем корневые пути для корректной работы React Router (SPA)
if (!coreUrls.includes('/')) coreUrls.push('/');
if (!coreUrls.includes('/index.html')) coreUrls.push('/index.html');

// Оставляем только уникальные пути (убираем возможные дубликаты)
coreUrls = [...new Set(coreUrls)];

// 1. СЛУШАЕМ КОМАНДЫ ОТ КНОПКИ ИЗ REACT
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_LAB') {
        caches.open('lab-core-cache').then(async (cache) => {
            let cachedCount = 0;
            let failedUrls = [];

            // Скачиваем файлы по одному (пуленепробиваемый метод)
            for (const url of coreUrls) {
                try {
                    // Идем на сервер напрямую, игнорируя дисковый кэш браузера
                    const response = await fetch(new Request(url, { cache: 'no-store' }));

                    if (response.ok) {
                        await cache.put(url, response);
                        cachedCount++;
                    } else {
                        failedUrls.push(url);
                        console.warn(`[PWA SW] Сервер вернул ошибку ${response.status} для файла: ${url}`);
                    }
                } catch (err) {
                    failedUrls.push(url);
                    console.error(`[PWA SW] Ошибка сети при скачивании файла: ${url}`, err);
                }
            }

            // Если мы скачали хотя бы главную страницу, считаем процесс успешным
            if (cachedCount > 0) {
                console.log(`[PWA SW] Успешно сохранено файлов: ${cachedCount}. Ошибок: ${failedUrls.length}`);
                event.source.postMessage({ type: 'LAB_CACHED_SUCCESS' });
            } else {
                event.source.postMessage({ type: 'LAB_CACHED_ERROR', error: "Не удалось скачать ни один файл" });
            }
        })
            .catch((err) => {
                event.source.postMessage({ type: 'LAB_CACHED_ERROR', error: err.message });
            });
    }
});

// 2. СТРОГИЙ ПЕРЕХВАТЧИК ЗАПРОСОВ
self.addEventListener('fetch', (event) => {
    // ПРОПУСКАЕМ HEAD-запросы напрямую на сервер (они нужны для проверки обновлений)
    if (event.request.method === 'HEAD') return;

    const url = new URL(event.request.url);

    // Логика для компиляторов (как мы делали раньше)
    if (url.pathname.includes('/compilers/')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(new Request(event.request, { cache: 'no-store' })).catch(() => {
                    return new Response("Offline", { status: 503 });
                });
            })
        );
        return;
    }

    // Логика для самой В-Лабы (Оболочка)
    // Для главной страницы SPA возвращаем index.html из кэша
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('/').then((cached) => {
                if (cached) return cached;
                return fetch(event.request).catch(() => new Response("Offline", { status: 503 }));
            })
        );
        return;
    }

    // Для всех остальных файлов (JS, CSS)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached; // Отдаем из кэша ТОЛЬКО если пользователь нажал кнопку
            // Иначе идем в сеть, ничего не сохраняя
            return fetch(event.request).catch(() => new Response("Offline", { status: 503 }));
        })
    );
});