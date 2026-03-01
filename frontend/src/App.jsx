import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

import { AppBar, Toolbar, Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';

function App() {
    const [roomId] = useState('lab-task-001');
    const [isOnline, setIsOnline] = useState(false);

    // Состояния для оболочки
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isLabCached, setIsLabCached] = useState(false);
    const [isLabDownloading, setIsLabDownloading] = useState(false);
    const [hasLabUpdate, setHasLabUpdate] = useState(false);

    // 1. Проверка доступности сервера и обновлений оболочки
    useEffect(() => {
        const checkServerStatus = async () => {
            if (!navigator.onLine) {
                setIsOnline(false);
                return;
            }
            try {
                await fetch('/', { method: 'HEAD', cache: 'no-store' });
                setIsOnline(true);
            } catch (error) {
                setIsOnline(false);
            }
        };

        const checkLabUpdate = async () => {
            try {
                const cache = await caches.open('lab-core-cache');
                const cachedRes = await cache.match('/index.html');
                if (!cachedRes) return;

                // Запрашиваем заголовки свежего файла с сервера
                const netRes = await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });

                // Сравниваем ETag (уникальный хэш файла) или дату изменения
                const cachedEtag = cachedRes.headers.get('etag');
                const netEtag = netRes.headers.get('etag');
                const cachedDate = cachedRes.headers.get('last-modified');
                const netDate = netRes.headers.get('last-modified');

                if ((cachedEtag && netEtag && cachedEtag !== netEtag) ||
                    (cachedDate && netDate && cachedDate !== netDate)) {
                    setHasLabUpdate(true);
                } else {
                    setHasLabUpdate(false);
                }
            } catch (e) {
                // Игнорируем ошибки сети
            }
        };

        checkServerStatus();
        if (isOnline && isLabCached) checkLabUpdate();

        const interval = setInterval(() => {
            checkServerStatus();
            if (isOnline && isLabCached) checkLabUpdate();
        }, 15000); // Проверяем каждые 15 секунд

        return () => clearInterval(interval);
    }, [isOnline, isLabCached]);

    // 2. Проверка кэша и установка PWA
    useEffect(() => {
        caches.has('lab-core-cache').then(setIsLabCached);

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'LAB_CACHED_SUCCESS') {
                setIsLabCached(true);
                setIsLabDownloading(false);

                // Если мы обновляли лабу, перезагружаем страницу, чтобы применить новые скрипты
                setHasLabUpdate(prev => {
                    if (prev) window.location.reload();
                    return false;
                });
            }
            if (event.data && event.data.type === 'LAB_CACHED_ERROR') {
                alert(`Ошибка скачивания: ${event.data.error}`);
                setIsLabDownloading(false);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
    }, []);

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
        // Удаляем старый кэш и сразу скачиваем новый
        await caches.delete('lab-core-cache');
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        }
    };

    const handleDeleteLabCore = async () => {
        if (window.confirm("Удалить интерфейс лаборатории из устройства?")) {
            await caches.delete('lab-core-cache');
            setIsLabCached(false);
            setHasLabUpdate(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', p: 3, gap: 3 }}>

            <AppBar position="static" color="default" elevation={1} sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>

                    <Header roomId={roomId} />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>

                        {/* 1. Установка App */}
                        {installPrompt && (
                            <Button variant="contained" color="secondary" startIcon={<InstallDesktopIcon />} onClick={handleInstallApp}>
                                Установить App
                            </Button>
                        )}

                        {/* 2. Индикатор скачивания */}
                        {isLabDownloading && (
                            <Chip label="Скачиваем..." color="primary" variant="outlined" />
                        )}

                        {/* 3. Кнопка "Скачать оболочку" (если нет кэша) */}
                        {!isLabCached && !isLabDownloading && (
                            <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleDownloadLabCore}>
                                Скачать оболочку
                            </Button>
                        )}

                        {/* 4. Кнопка "Обновить оболочку" (если есть кэш и есть обнова) */}
                        {isLabCached && hasLabUpdate && isOnline && !isLabDownloading && (
                            <Button variant="contained" color="warning" startIcon={<SyncIcon />} onClick={handleUpdateLabCore} sx={{ animation: 'pulse 2s infinite' }}>
                                Обновить оболочку
                            </Button>
                        )}

                        {/* 5. Статус "Оболочка сохранена" + кнопка удаления (если актуальна) */}
                        {isLabCached && !hasLabUpdate && !isLabDownloading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip icon={<CloudDoneIcon />} label="Оболочка сохранена" color="success" variant="outlined" />
                                <Tooltip title="Удалить интерфейс из кэша">
                                    <IconButton color="error" onClick={handleDeleteLabCore} size="small">
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        {/* 6. Статус сети */}
                        <Chip
                            icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
                            label={isOnline ? 'ONLINE' : 'OFFLINE'}
                            color={isOnline ? 'success' : 'error'}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            <Workspace roomId={roomId} isOnline={isOnline} />
        </Box>
    );
}

export default App;