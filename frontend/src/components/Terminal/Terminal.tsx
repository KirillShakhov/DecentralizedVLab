import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

export default function Terminal({ output, isWasmReady, onRunCode }) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" gutterBottom>
                Консоль (WASM Edge)
            </Typography>

            <Box
                sx={{
                    flexGrow: 1,
                    bgcolor: '#000',
                    color: '#0f0', // Классический зеленый терминал
                    p: 1.5,
                    borderRadius: 1,
                    fontFamily: '"Fira Code", monospace',
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                    mb: 2,
                    border: '1px solid #333'
                }}
            >
                {output}
            </Box>

            <Button
                variant="contained"
                color={isWasmReady ? "primary" : "inherit"}
                disabled={!isWasmReady}
                onClick={onRunCode}
                startIcon={isWasmReady ? <PlayArrowIcon /> : <HourglassEmptyIcon />}
                fullWidth
                sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    textTransform: 'none',
                    fontSize: '1rem'
                }}
            >
                {isWasmReady ? 'Запустить локально (WASM)' : 'Загрузка рантайма...'}
            </Button>
        </Box>
    );
}