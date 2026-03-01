import React, { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import Workspace from './components/Workspace/Workspace';
import TopBar from './components/TopBar/TopBar';
import { useAppManager } from './hooks/useAppManager';

function App() {
    const [roomId] = useState('lab-task-001');

    const appManager = useAppManager();

    // ЭКРАН ЗАГРУЗКИ
    if (!appManager.isAppReady) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
                <CircularProgress size={60} thickness={4} color="primary" />
                <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary', fontWeight: 'bold' }}>
                    Инициализация В-Лаборатории...
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.disabled' }}>
                    Проверка децентрализованных узлов и кэша
                </Typography>
            </Box>
        );
    }

    // ОСНОВНОЙ ИНТЕРФЕЙС
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', p: 3, gap: 3 }}>
            {/* Передаем логику в шапку */}
            <TopBar roomId={roomId} appManager={appManager} />

            {/* Передаем статус сети в рабочую область */}
            <Workspace roomId={roomId} isOnline={appManager.isOnline} />
        </Box>
    );
}

export default App;