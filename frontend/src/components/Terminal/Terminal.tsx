import React from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

interface TerminalProps {
    output: string;
    stdin: string;
    isWasmReady: boolean;
    onRunCode: () => void;
    onStdinChange: (value: string) => void;
}

export default function Terminal({ output, stdin, isWasmReady, onRunCode, onStdinChange }: TerminalProps) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1a1a2e' }}>
            {/* Заголовок терминала */}
            <Box sx={{
                px: 2, py: 1,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: '#16213e',
            }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'monospace' }}>
                    Консоль (WASM Edge)
                </Typography>
            </Box>

            {/* Вывод */}
            <Box
                sx={{
                    flexGrow: 1,
                    bgcolor: '#0d1117',
                    color: '#4ade80',
                    p: 1.5,
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    fontSize: 13,
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                    letterSpacing: '0.01em',
                }}
            >
                {output}
            </Box>

            {/* Stdin + Run */}
            <Box sx={{ p: 1.5, bgcolor: '#16213e', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <TextField
                    label="stdin"
                    placeholder="Входные данные для программы"
                    multiline
                    rows={2}
                    value={stdin}
                    onChange={(e) => onStdinChange(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{
                        mb: 1.5,
                        '& .MuiOutlinedInput-root': {
                            bgcolor: 'rgba(0,0,0,0.3)',
                            borderRadius: '8px',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                            '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.35)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                        '& .MuiInputBase-input': {
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.8)',
                        },
                    }}
                />

                <Button
                    variant="contained"
                    disabled={!isWasmReady}
                    onClick={onRunCode}
                    startIcon={isWasmReady ? <PlayArrowIcon /> : <HourglassEmptyIcon />}
                    fullWidth
                    sx={{
                        py: 1,
                        fontWeight: 700,
                        textTransform: 'none',
                        fontSize: 13,
                        borderRadius: '8px',
                        background: isWasmReady
                            ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                            : undefined,
                        boxShadow: isWasmReady ? '0 4px 12px rgba(79,70,229,0.35)' : 'none',
                        '&:hover': {
                            background: isWasmReady
                                ? 'linear-gradient(135deg, #4338ca 0%, #6d28d9 100%)'
                                : undefined,
                            boxShadow: isWasmReady ? '0 6px 16px rgba(79,70,229,0.45)' : 'none',
                        },
                        '&.Mui-disabled': {
                            bgcolor: 'rgba(255,255,255,0.07)',
                            color: 'rgba(255,255,255,0.3)',
                        },
                    }}
                >
                    {isWasmReady ? 'Запустить локально (WASM)' : 'Загрузка рантайма...'}
                </Button>
            </Box>
        </Box>
    );
}
