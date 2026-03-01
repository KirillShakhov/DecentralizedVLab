import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';

// Импорты MUI
import {
    Box, Paper, Select, MenuItem, FormControl,
    InputLabel, Button, Chip, Typography, CircularProgress
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';

const COMPILERS = {
    [PythonCompiler.id]: PythonCompiler,
    [JavaCompiler.id]: JavaCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler,
    [SQLiteCompiler.id]: SQLiteCompiler,
    [LuaCompiler.id]: LuaCompiler
};

const STORAGE_KEY = 'vlab_selected_compiler';

export default function Workspace({ roomId, isOnline }) {
    const [currentLang, setCurrentLang] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
    const [output, setOutput] = useState(currentLang ? 'Восстановление...' : 'Готов к работе');
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });

    const editorInstanceRef = useRef(null);

    const checkCurrentCompiler = async (langId) => {
        if (!langId || !COMPILERS[langId]) return;
        if (langId === 'javascript') {
            setStatus({ isDownloaded: true, isDownloading: false, progress: 0 });
            return;
        }
        const compiler = COMPILERS[langId];
        const downloaded = await compiler.isDownloaded();
        setStatus(prev => ({ ...prev, isDownloaded: downloaded }));
    };

    useEffect(() => { checkCurrentCompiler(currentLang); }, [currentLang]);

    useEffect(() => {
        const setupCompiler = async () => {
            if (!currentLang || !COMPILERS[currentLang]) return;
            const compiler = COMPILERS[currentLang];
            if (currentLang !== 'javascript' && !status.isDownloaded) return;

            setIsEngineReady(false);
            try {
                setOutput(`Инициализация ${compiler.name}...`);
                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ Среда ${compiler.name} готова.`);
            } catch (err) {
                setOutput(`⚠️ Ошибка: ${err.message}`);
            }
        };
        if (!status.isDownloading) setupCompiler();
    }, [currentLang, status.isDownloaded, status.isDownloading]);

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setCurrentLang(newLang);
        localStorage.setItem(STORAGE_KEY, newLang);
        setIsEngineReady(false);
        if (editorInstanceRef.current) {
            editorInstanceRef.current.setValue(newLang ? COMPILERS[newLang].template : "");
        }
    };

    const handleDownload = async () => {
        if (!currentLang) return;
        setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
        try {
            await COMPILERS[currentLang].downloadForOffline(p => setStatus(prev => ({ ...prev, progress: p })));
            await checkCurrentCompiler(currentLang);
        } catch (e) { alert("Ошибка загрузки"); }
        finally { setStatus(prev => ({ ...prev, isDownloading: false })); }
    };

    const runCode = async () => {
        if (!editorInstanceRef.current || !currentLang) return;
        setOutput('Запуск...');
        try {
            await COMPILERS[currentLang].run(editorInstanceRef.current.getValue(), setOutput);
        } catch (err) { setOutput(`❌ Ошибка: ${err.message}`); }
    };

    const selectedCompiler = COMPILERS[currentLang];

    return (
        <Box sx={{
            display: 'grid',
            // 2fr 1fr — пропорции, но minWidth: 0 позволяет колонкам сжиматься
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 2,
            p: 2,
            bgcolor: '#0a0a0a',
            // Ограничиваем высоту строго по viewport, чтобы не было скролла страницы
            height: 'calc(100vh - 64px)',
            boxSizing: 'border-box',
            overflow: 'hidden' // Запрещаем скролл самого контейнера
        }}>
            {/* ЛЕВАЯ ЧАСТЬ: Управление и Редактор */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                minHeight: 0 // Важно для вложенного flex-контента
            }}>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
                <Paper sx={{
                    p: 1.5, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    bgcolor: '#141414', border: '1px solid #2a2a2a', borderRadius: 2
                }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel sx={{ color: '#888' }}>Язык</InputLabel>
                        <Select
                            value={currentLang} label="Язык" onChange={handleLangChange}
                            sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, bgcolor: '#1d1d1d' }}
                        >
                            <MenuItem value=""><em>Отключено</em></MenuItem>
                            {Object.values(COMPILERS).map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {status.isDownloading && (
                            <Chip icon={<CircularProgress size={14} color="inherit" />} label={`${status.progress}%`} color="primary" variant="outlined" />
                        )}
                        {currentLang && !status.isDownloaded && !status.isDownloading && (
                            <Button variant="contained" size="small" startIcon={<CloudDownloadIcon />} onClick={handleDownload} sx={{ bgcolor: '#2e7d32' }}>
                                Скачать
                            </Button>
                        )}
                        {status.isDownloaded && currentLang !== 'javascript' && (
                            <Chip icon={<CloudDoneIcon sx={{ color: '#4caf50 !important' }}/>} label="Offline" variant="outlined" sx={{ color: '#4caf50', borderColor: '#4caf50' }} />
                        )}
                    </Box>
                </Paper>

                {/* КОНТЕЙНЕР РЕДАКТОРА */}
                <Paper sx={{
                    flexGrow: 1,
                    minHeight: 0, // Позволяет редактору сжиматься внутри flex
                    overflow: 'hidden',
                    position: 'relative',
                    bgcolor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 2
                }}>
                    {!currentLang && (
                        <Box sx={{
                            position: 'absolute', zIndex: 10, inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(4px)'
                        }}>
                            <Typography color="#888">Выберите движок для активации</Typography>
                        </Box>
                    )}
                    <CodeEditor
                        roomId={roomId}
                        language={selectedCompiler?.monacoLang || 'text'}
                        onEditorReady={(editor) => {
                            editorInstanceRef.current = editor;
                            // Monaco требует принудительного ресайза, если контейнер изменился
                            window.addEventListener('resize', () => editor.layout());
                            if (currentLang && editor.getValue() === '') {
                                editor.setValue(selectedCompiler.template);
                            }
                        }}
                    />
                </Paper>
            </Box>

            {/* ПРАВАЯ ЧАСТЬ: Терминал */}
            <Paper sx={{
                minHeight: 0, // Позволяет терминалу сжиматься
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#000', border: '1px solid #2a2a2a', borderRadius: 2
            }}>
                <Terminal
                    output={output}
                    isWasmReady={isEngineReady}
                    onRunCode={runCode}
                />
            </Paper>
        </Box>
    );
}