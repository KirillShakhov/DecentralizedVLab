import React from 'react';
import Header from '../Header/Header';
import { AppBar, Toolbar, Box, Button, Chip, IconButton, Tooltip } from '@mui/material';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import DeleteIcon from '@mui/icons-material/Delete';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import SyncIcon from '@mui/icons-material/Sync';

export default function TopBar({ roomId, appManager }) {
    const {
        isOnline, installPrompt, isLabCached, isLabDownloading, hasLabUpdate,
        handleInstallApp, handleDownloadLabCore, handleUpdateLabCore, handleDeleteLabCore
    } = appManager;

    return (
        <AppBar position="static" color="default" elevation={1} sx={{ borderRadius: 2, backgroundColor: 'background.paper' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>

                <Header roomId={roomId} />

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    {installPrompt && (
                        <Button variant="contained" color="secondary" startIcon={<InstallDesktopIcon />} onClick={handleInstallApp}>
                            Установить App
                        </Button>
                    )}

                    {isLabDownloading && (
                        <Chip label="Скачиваем..." color="primary" variant="outlined" />
                    )}

                    {!isLabCached && !isLabDownloading && (
                        <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleDownloadLabCore}>
                            Скачать оболочку
                        </Button>
                    )}

                    {isLabCached && hasLabUpdate && isOnline && !isLabDownloading && (
                        <Button variant="contained" color="warning" startIcon={<SyncIcon />} onClick={handleUpdateLabCore} sx={{ animation: 'pulse 2s infinite' }}>
                            Обновить оболочку
                        </Button>
                    )}

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

                    <Chip
                        icon={isOnline ? <WifiIcon /> : <WifiOffIcon />}
                        label={isOnline ? 'ONLINE' : 'OFFLINE'}
                        color={isOnline ? 'success' : 'error'}
                    />
                </Box>
            </Toolbar>
        </AppBar>
    );
}