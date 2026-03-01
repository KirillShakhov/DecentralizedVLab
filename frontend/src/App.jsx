import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, CssBaseline } from '@mui/material';
import Workspace from './components/Workspace/Workspace';
import TopBar from './components/TopBar/TopBar';
import Settings from './components/Settings/Settings';
import { useAppManager } from './hooks/useAppManager';

function App() {
    const [roomId] = useState('lab-task-001');
    const appManager = useAppManager();

    // ЭКРАН ЗАГРУЗКИ (Пока проверяем кэш и статус PWA)
    if (!appManager.isAppReady) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh', bgcolor: '#0a0a0a'
            }}>
                <CircularProgress size={60} thickness={4} sx={{ color: '#2196f3' }} />
                <Typography variant="h6" sx={{ mt: 3, color: '#fff', fontWeight: 'bold' }}>
                    Инициализация В-Лаборатории...
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
                    Проверка децентрализованных узлов и кэша WASM
                </Typography>
            </Box>
        );
    }

    // ОСНОВНОЙ ИНТЕРФЕЙС С РОУТИНГОМ
    return (
        <Router>
            <CssBaseline /> {/* Сбрасывает стандартные отступы браузера под темную тему */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                bgcolor: '#0a0a0a', // Общий фон приложения
                p: 3,
                gap: 3,
                boxSizing: 'border-box'
            }}>
                {/* Шапка всегда на месте, она использует useNavigate внутри */}
                <TopBar roomId={roomId} appManager={appManager} />

                {/* Контент меняется в зависимости от URL */}
                <Routes>
                    {/* Главная страница с редактором */}
                    <Route
                        path="/"
                        element={<Workspace roomId={roomId} isOnline={appManager.isOnline} />}
                    />

                    {/* Поддержка входа в конкретную комнату по ссылке */}
                    <Route
                        path="/room/:id"
                        element={<Workspace roomId={roomId} isOnline={appManager.isOnline} />}
                    />

                    {/* Новая страница настроек хранилища */}
                    <Route
                        path="/settings"
                        element={<Settings appManager={appManager} />}
                    />

                    {/* Редирект для несуществующих страниц */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Box>
        </Router>
    );
}

export default App;