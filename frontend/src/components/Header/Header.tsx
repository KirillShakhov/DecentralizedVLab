import React from 'react';
import { Box, Typography } from '@mui/material';

export default function Header({ roomId }) {
    return (
        <Box>
            <Typography variant="h6" component="h1" fontWeight="bold" color="text.primary">
                Децентрализованная В-Лаборатория
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Режим: Совместное программирование | Комната: {roomId}
            </Typography>
        </Box>
    );
}