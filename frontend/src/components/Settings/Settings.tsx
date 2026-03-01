import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemText,
    ListItemSecondaryAction, IconButton, LinearProgress,
    Divider, Button, Card, CardContent, Container
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { COMPILERS } from '../../compilers';
import { getCacheSize, formatBytes } from '../../utils/storage';

// Принимаем appManager через пропсы (убедись, что передаешь его в App.jsx)
export default function Settings({ appManager }) {
    const [stats, setStats] = useState([]);
    const [total, setTotal] = useState(0);
    const [quota, setQuota] = useState(0);

    const loadStats = async () => {
        const data = [];
        let totalSize = 0;

        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            setQuota(estimate.quota || 0);
        }

        // 1. ДОБАВЛЯЕМ СИСТЕМУ (ЯДРО) ПЕРВОЙ СТРОКОЙ
        const coreCacheName = 'lab-core-cache'; // Имя кэша из sw.js
        const coreSize = await getCacheSize(coreCacheName);

        data.push({
            id: 'core',
            name: 'Система (Оболочка В-Лабы)',
            size: coreSize,
            isCore: true // Флаг для особой логики удаления
        });
        totalSize += coreSize;

        // 2. ДОБАВЛЯЕМ КОМПИЛЯТОРЫ
        for (const compiler of Object.values(COMPILERS)) {
            const cacheName = compiler.CACHE_NAME || `wasm-compiler-${compiler.id}`;
            const size = await getCacheSize(cacheName);

            data.push({ ...compiler, size });
            totalSize += size;
        }

        setStats(data);
        setTotal(totalSize);
    };

    useEffect(() => { loadStats(); }, []);

    const handleDelete = async (item: any) => {
        if (item.isCore) {
            // Для системы используем мощный метод из менеджера (он сам вызовет confirm и reload)
            if (appManager && appManager.handleDeleteLabCore) {
                await appManager.handleDeleteLabCore();
            } else {
                alert("Ошибка: appManager не подключен к настройкам.");
            }
        } else {
            // Для компиляторов используем стандартное удаление
            if (window.confirm(`Удалить локальные файлы ${item.name}?`)) {
                await item.removeOffline();
                await loadStats();
            }
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 2 }}>
            <Typography variant="h5" sx={{ color: '#fff', mb: 3, fontWeight: 'bold' }}>
                Мониторинг ресурсов
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 320px', xs: '1fr' }, gap: 3 }}>
                <Paper variant="outlined" sx={{ bgcolor: '#141414', borderColor: '#2a2a2a', borderRadius: 3 }}>
                    <List disablePadding>
                        {stats.map((item, index) => (
                            <React.Fragment key={item.id}>
                                <ListItem sx={{ py: 2 }}>
                                    <ListItemText
                                        primary={
                                            <Typography sx={{ color: item.isCore ? '#2196f3' : '#fff', fontWeight: 600 }}>
                                                {item.name}
                                            </Typography>
                                        }
                                        secondary={item.size > 0 ? `Занято: ${formatBytes(item.size)}` : 'Не загружено'}
                                        secondaryTypographyProps={{ sx: { color: item.size > 0 ? '#4caf50' : '#555' } }}
                                    />
                                    <ListItemSecondaryAction>
                                        {/* Показываем кнопку удаления, если размер > 0 */}
                                        {item.size > 0 && (
                                            <IconButton color="error" onClick={() => handleDelete(item)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {index < stats.length - 1 && <Divider sx={{ bgcolor: '#222' }} />}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Card sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 3 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                                <StorageIcon color="primary" />
                                <Typography variant="h6">Память</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                                Всего: <strong>{formatBytes(total)}</strong>
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={quota ? (total / quota) * 100 : 0}
                                sx={{ height: 6, borderRadius: 3, bgcolor: '#222', mb: 2 }}
                            />
                            <Typography variant="caption" sx={{ color: '#555' }}>
                                Доступно браузером: {formatBytes(quota)}
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Дополнительная кнопка полного сброса (опционально, если добавляли handleNuclearWipe) */}
                    {appManager?.handleNuclearWipe && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<WarningAmberIcon />}
                            onClick={appManager.handleNuclearWipe}
                            sx={{ borderRadius: 2, textTransform: 'none', py: 1.5, borderColor: 'rgba(211, 47, 47, 0.5)' }}
                        >
                            Экстренный сброс данных
                        </Button>
                    )}
                </Box>
            </Box>
        </Container>
    );
}