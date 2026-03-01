import { useState, useEffect } from 'react';

const CORE_CACHE_PREFIX = 'lab-core';

export function useAppManager() {
    const [isAppReady, setIsAppReady] = useState(false);
    const [isOnline, setIsOnline] = useState(true);

    const [installPrompt, setInstallPrompt] = useState(null);
    const [isLabCached, setIsLabCached] = useState(false);
    const [isLabDownloading, setIsLabDownloading] = useState(false);
    const [hasLabUpdate, setHasLabUpdate] = useState(false);

    // 1. Инициализация и проверка сети
    useEffect(() => {
        let isMounted = true;
        const initializeApp = async () => {
            if ('serviceWorker' in navigator) {
                const isWiped = localStorage.getItem('VLAB_WIPED_LOCK');
                if (!isWiped) {
                    navigator.serviceWorker.register('/sw.js')
                        .then(() => console.log("Service Worker зарегистрирован"))
                        .catch(err => console.error("Ошибка регистрации SW:", err));
                } else {
                    console.warn("Регистрация SW заблокирована после удаления кэша.");
                }
            }

            const hasCache = await caches.has('lab-core-cache');
            let currentlyOnline = navigator.onLine;
            if (currentlyOnline) {
                try {
                    await fetch('/', { method: 'HEAD', cache: 'no-store' });
                } catch (error) {
                    currentlyOnline = false;
                }
            }
            if (isMounted) {
                setIsLabCached(hasCache);
                setIsOnline(currentlyOnline);
                setIsAppReady(true);
            }
        };

        initializeApp();

        const networkInterval = setInterval(async () => {
            let currentlyOnline = navigator.onLine;
            if (currentlyOnline) {
                try {
                    await fetch('/', { method: 'HEAD', cache: 'no-store' });
                } catch (error) {
                    currentlyOnline = false;
                }
            }
            if (isMounted) setIsOnline(currentlyOnline);
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(networkInterval);
        };
    }, []);

    // 2. Проверка обновлений кэша
    useEffect(() => {
        const checkLabUpdate = async () => {
            try {
                const cache = await caches.open('lab-core-cache');
                const cachedRes = await cache.match('/index.html');
                if (!cachedRes) return;

                const netRes = await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });

                const cachedDate = cachedRes.headers.get('last-modified');
                const netDate = netRes.headers.get('last-modified');
                const cachedEtag = cachedRes.headers.get('etag');
                const netEtag = netRes.headers.get('etag');

                if ((cachedEtag && netEtag && cachedEtag !== netEtag) ||
                    (cachedDate && netDate && cachedDate !== netDate)) {
                    setHasLabUpdate(true);
                } else {
                    setHasLabUpdate(false);
                }
            } catch (e) {} // Игнорируем ошибки сети
        };

        if (isAppReady && isOnline && isLabCached) checkLabUpdate();
    }, [isAppReady, isOnline, isLabCached]);

    // 3. Перехват PWA событий
    useEffect(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'LAB_CACHED_SUCCESS') {
                setIsLabCached(true);
                setIsLabDownloading(false);
                setHasLabUpdate(prev => {
                    if (prev) window.location.reload();
                    return false;
                });
            }
            if (event.data && event.data.type === 'LAB_CACHED_ERROR') {
                alert(`Ошибка скачивания: ${event.data.error}`);
                setIsLabDownloading(false);
            }
            if (event.data && event.data.type === 'LAB_CLEARED_SUCCESS') {
                console.log("Кэш успешно очищен воркером");
                setIsLabCached(false);
                setHasLabUpdate(false);
                window.location.reload(true);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
    }, []);

    // 4. Методы управления
    const handleInstallApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') setInstallPrompt(null);
    };

    const handleDownloadLabCore = async () => {
        // 1. Снимаем блокировку
        localStorage.removeItem('VLAB_WIPED_LOCK');

        // 2. Если SW был убит, регистрируем его заново перед скачиванием
        if ('serviceWorker' in navigator) {
            await navigator.serviceWorker.register('/sw.js');
        }

        // 3. Запускаем скачивание
        if (navigator.serviceWorker.controller) {
            setIsLabDownloading(true);
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        } else {
            // Если контроллер еще не успел перехватить управление, ждем чуть-чуть или просим обновить
            alert("Инициализация загрузчика... Нажмите кнопку скачивания еще раз через секунду.");
            window.location.reload();
        }
    };

    const handleUpdateLabCore = async () => {
        setIsLabDownloading(true);
        await caches.delete('lab-core-cache');
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        }
    };

    const handleDeleteLabCore = async () => {
        if (window.confirm("Удалить офлайн-систему и полностью очистить память?")) {
            try {
                console.log("[Wipe] Начинаем полную зачистку...");

                // 1. Ставим "предохранитель" от авто-восстановления
                localStorage.setItem('VLAB_WIPED_LOCK', 'true');

                // 2. Отключаем Service Worker
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    await reg.unregister();
                }

                // 3. Вычищаем Cache Storage (ВСЁ, кроме компиляторов)
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => {
                    const isCompiler = name.includes('wasm-compiler') || name.includes('pyodide') || name.includes('sql');
                    if (!isCompiler) {
                        console.log(`[Wipe] Удаляем кэш: ${name}`);
                        return caches.delete(name);
                    }
                }));

                // 4. Вычищаем IndexedDB (Здесь Workbox прячет данные, из-за которых растет объем!)
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    for (const db of dbs) {
                        if (db.name && (db.name.includes('workbox') || db.name.includes('lab-core'))) {
                            console.log(`[Wipe] Удаляем базу IndexedDB: ${db.name}`);
                            window.indexedDB.deleteDatabase(db.name);
                        }
                    }
                }

                // 5. Очищаем стейт и перезагружаем страницу (replace не оставляет историю)
                setIsLabCached(false);
                setHasLabUpdate(false);
                window.location.replace('/');

            } catch (err) {
                console.error("Ошибка при зачистке:", err);
            }
        }
    };

    return {
        isAppReady, isOnline, installPrompt, isLabCached,
        isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore
    };
}