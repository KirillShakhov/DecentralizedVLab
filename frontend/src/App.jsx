import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

// Импорты MUI
import { AppBar, Toolbar, Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

function App() {
    const [roomId] = useState('lab-task-001');
    const [isOnline, setIsOnline] = useState(true);

    // Состояния для оболочки
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isLabCached, setIsLabCached] = useState(false);
    const [isLabDownloading, setIsLabDownloading] = useState(false);

    // 1. Проверка доступности сервера
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
        checkServerStatus();
        const interval = setInterval(checkServerStatus, 5000);
        return () => clearInterval(interval);
    }, []);

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

    const handleDeleteLabCore = async () => {
        if (window.confirm("Удалить интерфейс лаборатории из устройства?")) {
            await caches.delete('lab-core-cache');
            setIsLabCached(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', p: 3, gap: 3 }}>

            {/* КРАСИВАЯ ШАПКА MUI */}
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

                        {/* 2. Скачивание интерфейса */}
                        {isLabDownloading && (
                            <Chip label="Скачиваем..." color="primary" variant="outlined" />
                        )}

                        {!isLabCached && !isLabDownloading && (
                            <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleDownloadLabCore}>
                                Скачать оболочку
                            </Button>
                        )}

                        {isLabCached && !isLabDownloading && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip icon={<CloudDoneIcon />} label="Оболочка сохранена" color="success" variant="outlined" />
                                <Tooltip title="Удалить интерфейс из кэша">
                                    <IconButton color="error" onClick={handleDeleteLabCore} size="small">
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}

                        {/* 3. Статус сети */}
                        <Chip
                            icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
                            label={isOnline ? 'ONLINE' : 'OFFLINE'}
                            color={isOnline ? 'success' : 'error'}
                        />
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Рабочая область */}
            <Workspace roomId={roomId} isOnline={isOnline} />
        </Box>
    );
}

export default App;