import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Box, Button, Chip, IconButton,
    Tooltip, Divider, Avatar, Typography,
} from '@mui/material';
import { sessionDB } from '../../db';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import SyncIcon from '@mui/icons-material/Sync';
import type { User } from '../../types';

interface Props {
    appManager: any;
    user?: User | null;
}

export default function TopBar({ appManager, user }: Props) {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        isOnline, installPrompt, isLabCached, isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore,
    } = appManager;

    const isSettingsPage = location.pathname === '/settings';
    const isHomePage = location.pathname === '/';
    const isSession = location.pathname.startsWith('/session/');

    const [sessionContext, setSessionContext] = useState<{ labTitle: string; courseTitle: string } | null>(null);

    useEffect(() => {
        if (!isSession) { setSessionContext(null); return; }
        const sessionId = location.pathname.split('/session/')[1];
        if (!sessionId) return;
        sessionDB.get(sessionId).then(s => {
            if (s) setSessionContext({ labTitle: s.labTitle, courseTitle: s.courseTitle });
        });
    }, [location.pathname, isSession]);

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{
                bgcolor: '#141414',
                borderBottom: '1px solid #2a2a2a',
                zIndex: (theme) => theme.zIndex.drawer + 1,
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>

                {/* ЛЕВАЯ ЧАСТЬ: Лого + навигация */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                        variant="h6"
                        fontWeight="bold"
                        sx={{
                            cursor: 'pointer', color: '#fff',
                            '&:hover': { color: '#90caf9' },
                            userSelect: 'none',
                        }}
                        onClick={() => navigate('/')}
                    >
                        В-Лаба
                    </Typography>

                    {!isHomePage && (
                        <Tooltip title="Главная">
                            <IconButton
                                size="small"
                                onClick={() => navigate('/')}
                                sx={{ color: '#666', '&:hover': { color: '#fff' } }}
                            >
                                <HomeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}

                    {isSession && sessionContext && (
                        <>
                            <Divider orientation="vertical" flexItem sx={{ bgcolor: '#2a2a2a', mx: 0.5 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                <Typography variant="caption" color="#555" noWrap sx={{ maxWidth: 240 }}>
                                    {sessionContext.courseTitle}
                                </Typography>
                                <Typography variant="body2" fontWeight="bold" color="#ccc" noWrap sx={{ maxWidth: 240 }}>
                                    {sessionContext.labTitle}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>

                {/* ПРАВАЯ ЧАСТЬ: Статусы + управление */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>

                    {/* Управление оболочкой — только вне сессии */}
                    {!isSession && (
                        <>
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
                                    Скачать оффлайн
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
                                            label="Offline"
                                            size="small"
                                            variant="outlined"
                                            sx={{ color: '#4caf50', borderColor: '#4caf50' }}
                                        />
                                    )}
                                    <Tooltip title="Удалить из кэша">
                                        <IconButton color="error" onClick={handleDeleteLabCore} size="small">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            )}

                            <Divider orientation="vertical" flexItem sx={{ bgcolor: '#333', mx: 0.5 }} />
                        </>
                    )}

                    {/* Статус сети */}
                    <Chip
                        icon={isOnline ? <CloudDoneIcon /> : <CloudOffIcon />}
                        label={isOnline ? 'Online' : 'Offline'}
                        size="small"
                        sx={{
                            bgcolor: isOnline ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)',
                            color: isOnline ? '#4caf50' : '#ff9800',
                            border: `1px solid ${isOnline ? '#4caf50' : '#ff9800'}`,
                            fontWeight: 'bold',
                        }}
                    />

                    {installPrompt && (
                        <Tooltip title="Установить как приложение">
                            <IconButton color="secondary" onClick={handleInstallApp} size="small">
                                <InstallDesktopIcon />
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Настройки хранилища">
                        <IconButton
                            size="small"
                            onClick={() => navigate('/settings')}
                            sx={{ color: isSettingsPage ? '#2196f3' : '#666', '&:hover': { color: '#fff' } }}
                        >
                            <SettingsIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    {/* Юзер-аватар */}
                    {user && (
                        <Tooltip title={user.username}>
                            <Avatar
                                sx={{
                                    width: 32, height: 32,
                                    bgcolor: user.color,
                                    fontSize: 14, fontWeight: 'bold',
                                    cursor: 'default',
                                }}
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </Avatar>
                        </Tooltip>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
