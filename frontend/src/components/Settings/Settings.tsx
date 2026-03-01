import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, List, ListItem, ListItemText,
    ListItemSecondaryAction, IconButton, LinearProgress,
    Divider, Button, Card, CardContent, Container
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import { COMPILERS } from '../../compilers';
import { getCacheSize, formatBytes } from '../../utils/storage';

export default function Settings() {
    const [stats, setStats] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [quota, setQuota] = useState(0);

    const loadStats = async () => {
        const data = [];
        let totalSize = 0;

        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            setQuota(estimate.quota || 0);
        }

        for (const compiler of Object.values(COMPILERS)) {
            if (compiler.id === 'javascript') continue;

            // Получаем кэш компилятора (например, wasmoon для Lua)
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
        if (window.confirm(`Удалить локальные файлы ${item.name}?`)) {
            await item.removeOffline();
            await loadStats();
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
                                        primary={<Typography sx={{ color: '#fff', fontWeight: 600 }}>{item.name}</Typography>}
                                        secondary={item.size > 0 ? `Занято: ${formatBytes(item.size)}` : 'Не загружено'}
                                        secondaryTypographyProps={{ sx: { color: item.size > 0 ? '#4caf50' : '#555' } }}
                                    />
                                    <ListItemSecondaryAction>
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

                <Card sx={{ bgcolor: '#141414', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 3, height: 'fit-content' }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                            <StorageIcon color="primary" />
                            <Typography variant="h6">Память</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                            Всего: <strong>{formatBytes(total)}</strong>
                        </Typography>
                        <LinearProgress variant="determinate" value={quota ? (total / quota) * 100 : 0} sx={{ height: 6, borderRadius: 3, bgcolor: '#222' }} />
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
}