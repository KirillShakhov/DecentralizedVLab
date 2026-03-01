import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../Header/Header';
import {
    AppBar, Toolbar, Box, Button, Chip, IconButton,
    Tooltip, Divider
} from '@mui/material';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import SyncIcon from '@mui/icons-material/Sync';

export default function TopBar({ roomId, appManager }) {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        isOnline, installPrompt, isLabCached, isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore
    } = appManager;

    const isSettingsPage = location.pathname === '/settings';

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                bgcolor: '#141414',
                borderBottom: '1px solid #2a2a2a',
                zIndex: (theme) => theme.zIndex.drawer + 1
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Header roomId={roomId} />
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    {/* УПРАВЛЕНИЕ ОБОЛОЧКОЙ (CORE) */}
                    {isLabDownloading && (
                        <Chip label="Загрузка ядра..." size="small" color="primary" variant="outlined" />
                    )}

                    {!isLabCached && !isLabDownloading && isOnline && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloudDownloadIcon />}
                            onClick={handleDownloadLabCore}
                            sx={{ bgcolor: '#1976d2' }}
                        >
                            Скачать оболочку
                        </Button>
                    )}

                    {isLabCached && !isLabDownloading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {hasLabUpdate && isOnline ? (
                                <Button
                                    variant="contained"
                                    color="warning"
                                    size="small"
                                    startIcon={<SyncIcon />}
                                    onClick={handleUpdateLabCore}
                                >
                                    Обновить
                                </Button>
                            ) : (
                                <Chip
                                    icon={<CloudDoneIcon />}
                                    label="Оболочка сохранена"
                                    size="small"
                                    variant="outlined"
                                    sx={{ color: '#4caf50', borderColor: '#4caf50' }}
                                />
                            )}

                            {/* КНОПКА УДАЛЕНИЯ КЭША ЯДРА */}
                            <Tooltip title="Удалить интерфейс из кэша">
                                <IconButton
                                    color="error"
                                    onClick={handleDeleteLabCore}
                                    size="small"
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    <Divider orientation="vertical" flexItem sx={{ bgcolor: '#333', mx: 1 }} />

                    {/* СТАТУС СЕТИ */}
                    <Chip
                        icon={isOnline ? <CloudDoneIcon /> : <CloudOffIcon />}
                        label={isOnline ? 'ONLINE' : 'OFFLINE'}
                        size="small"
                        sx={{
                            bgcolor: isOnline ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            color: isOnline ? '#4caf50' : '#ff9800',
                            border: `1px solid ${isOnline ? '#4caf50' : '#ff9800'}`,
                            fontWeight: 'bold'
                        }}
                    />

                    {installPrompt && (
                        <IconButton color="secondary" onClick={handleInstallApp}>
                            <InstallDesktopIcon />
                        </IconButton>
                    )}

                    <Tooltip title="Память">
                        <IconButton onClick={() => navigate('/settings')} sx={{ color: isSettingsPage ? '#2196f3' : '#666' }}>
                            <StorageIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Код">
                        <IconButton onClick={() => navigate('/')} sx={{ color: !isSettingsPage ? '#2196f3' : '#666' }}>
                            <CodeIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}