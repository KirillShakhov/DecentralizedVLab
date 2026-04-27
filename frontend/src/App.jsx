import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, CssBaseline } from '@mui/material';
import TopBar from './components/TopBar/TopBar';
import Settings from './components/Settings/Settings';
import ProfileSetupDialog from './components/ProfileSetupDialog/ProfileSetupDialog';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import CourseEditorPage from './pages/CourseEditorPage';
import SessionPage from './pages/SessionPage';
import { useAppManager } from './hooks/useAppManager';
import { useUserProfile } from './hooks/useUserProfile';

function App() {
    const appManager = useAppManager();
    const { user, isProfileReady, createProfile } = useUserProfile();

    // Экран инициализации
    if (!appManager.isAppReady) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '100vh', bgcolor: '#0a0a0a',
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

    return (
        <Router>
            <CssBaseline />

            {/* Диалог первого запуска — блокирует всё, пока нет профиля */}
            <ProfileSetupDialog
                open={!isProfileReady}
                onConfirm={createProfile}
            />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
                bgcolor: '#0a0a0a',
            }}>
                <TopBar appManager={appManager} user={user} />

                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <Routes>
                        {/* Главная */}
                        <Route
                            path="/"
                            element={user ? <HomePage user={user} /> : null}
                        />

                        {/* Курсы */}
                        <Route
                            path="/courses/new"
                            element={user ? <CourseEditorPage user={user} /> : null}
                        />
                        <Route
                            path="/courses/:courseId/edit"
                            element={user ? <CourseEditorPage user={user} /> : null}
                        />
                        <Route
                            path="/courses/:courseId"
                            element={user ? <CoursePage user={user} /> : null}
                        />

                        {/* Сессия (рабочая область) */}
                        <Route
                            path="/session/:sessionId"
                            element={user
                                ? <SessionPage user={user} isOnline={appManager.isOnline} />
                                : null
                            }
                        />

                        {/* Настройки */}
                        <Route
                            path="/settings"
                            element={<Settings appManager={appManager} />}
                        />

                        {/* Редирект старых ссылок на /room/:id */}
                        <Route path="/room/:id" element={<Navigate to="/" replace />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Box>
            </Box>
        </Router>
    );
}

export default App;
