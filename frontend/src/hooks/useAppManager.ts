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

    const handleDownloadLabCore = () => {
        if (navigator.serviceWorker.controller) {
            setIsLabDownloading(true);
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        } else {
            alert("Service Worker еще не готов. Перезагрузите страницу.");
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
        if (window.confirm("Полная очистка: удалить интерфейс и все дубликаты кэша?")) {
            try {
                // 1. Получаем список ВЕХ кэшей в браузере
                const cacheNames = await caches.keys();

                // 2. Определяем, что МЫ НЕ ХОТИМ удалять (компиляторы)
                const compilersPrefixes = ['wasm-compiler', 'sql-wasm', 'pyodide'];

                const deletionPromises = cacheNames.map(name => {
                    // Если кэш НЕ относится к компиляторам, значит это системный мусор или ядро
                    const isCompiler = compilersPrefixes.some(p => name.includes(p));

                    if (!isCompiler) {
                        console.log(`[Storage] Удаление лишнего кэша: ${name}`);
                        return caches.delete(name);
                    }
                    return Promise.resolve();
                });

                await Promise.all(deletionPromises);

                // 3. Отправляем команду в SW, чтобы он тоже "забыл" ресурсы
                if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_LAB_CACHE' });
                }

                // 4. Очистка состояния и жесткая перезагрузка
                setIsLabCached(false);
                window.location.reload(true);
            } catch (err) {
                console.error("Ошибка зачистки:", err);
            }
        }
    };

    return {
        isAppReady, isOnline, installPrompt, isLabCached,
        isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore
    };
}