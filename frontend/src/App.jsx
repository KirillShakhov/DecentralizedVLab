import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

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

    // 2. Проверка, скачана ли сама лаба + перехват окна установки
    useEffect(() => {
        caches.has('lab-core-cache').then(setIsLabCached);

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Слушаем ответы от Service Worker-а
        const handleSWMessage = (event) => {
            if (event.data && event.data.type === 'LAB_CACHED_SUCCESS') {
                setIsLabCached(true);
                setIsLabDownloading(false);
            }
            if (event.data && event.data.type === 'LAB_CACHED_ERROR') {
                alert("Ошибка скачивания файлов оболочки.");
                setIsLabDownloading(false);
            }
        };
        navigator.serviceWorker.addEventListener('message', handleSWMessage);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            navigator.serviceWorker.removeEventListener('message', handleSWMessage);
        };
    }, []);

    // Обработчики кнопок шапки
    const handleInstallApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') setInstallPrompt(null);
    };

    const handleDownloadLabCore = () => {
        if (navigator.serviceWorker.controller) {
            setIsLabDownloading(true);
            // Отправляем команду в sw.js закэшировать файлы
            navigator.serviceWorker.controller.postMessage({ type: 'CACHE_LAB' });
        } else {
            alert("Service Worker еще не готов. Перезагрузите страницу.");
        }
    };

    const handleDeleteLabCore = async () => {
        if (window.confirm("Удалить оболочку лаборатории из кэша?")) {
            await caches.delete('lab-core-cache');
            setIsLabCached(false);
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                <Header roomId={roomId} />

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>

                    {/* 1. Системная кнопка Установки (Ярлык) */}
                    {installPrompt && (
                        <button onClick={handleInstallApp} style={{ padding: '6px 12px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            📱 Установить как приложение
                        </button>
                    )}

                    {/* 2. Кнопка скачивания оболочки В-Лабы (JS/CSS) */}
                    {isLabDownloading && <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Скачиваем интерфейс...</span>}

                    {!isLabCached && !isLabDownloading && (
                        <button onClick={handleDownloadLabCore} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            ⬇️ Скачать оболочку лабы
                        </button>
                    )}

                    {isLabCached && !isLabDownloading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>💾 Оболочка сохранена</span>
                            <button onClick={handleDeleteLabCore} title="Удалить интерфейс из кэша" style={{ padding: '4px 6px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </div>
                    )}

                    {/* Статус сети */}
                    <div style={{
                        padding: '5px 15px',
                        borderRadius: '20px',
                        backgroundColor: isOnline ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                        color: isOnline ? '#10b981' : '#ef4444',
                        border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}>
                        {isOnline ? '● СЕРВЕР ДОСТУПЕН' : '○ РАБОТА БЕЗ СЕТИ'}
                    </div>
                </div>
            </div>

            <Workspace roomId={roomId} isOnline={isOnline} />
        </div>
    );
}

export default App;