import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';
import type { Lab } from '../../types';

// Импорты MUI
import {
    Box, Paper, Select, MenuItem, FormControl,
    InputLabel, Button, Chip, Typography, CircularProgress,
    IconButton, Tooltip
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RestartAltIcon from '@mui/icons-material/RestartAlt'; // Иконка сброса
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

const COMPILERS = {
    [PythonCompiler.id]: PythonCompiler,
    [JavaCompiler.id]: JavaCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler,
    [SQLiteCompiler.id]: SQLiteCompiler,
    [LuaCompiler.id]: LuaCompiler
};

const STORAGE_KEY = 'vlab_selected_compiler';

interface WorkspaceProps {
    roomId: string;
    isOnline: boolean;
    lab?: Lab; // если передана лаба — язык и начальный код берём из неё
}

export default function Workspace({ roomId, isOnline, lab }: WorkspaceProps) {
    // Если открыта лаба — используем её язык; иначе — последний выбранный
    const [currentLang, setCurrentLang] = useState(() => {
        if (lab) return lab.language;
        return localStorage.getItem(STORAGE_KEY) || '';
    });
    const [output, setOutput] = useState(currentLang ? 'Подключение к комнате...' : 'Выберите язык');

    // Начальный код из первого файла лабы (или стандартный шаблон компилятора)
    const initialCode = lab?.files?.[0]?.content ?? null;
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });

    const editorInstanceRef = useRef(null);

    // Синхронизация статуса компилятора
    const checkCurrentCompiler = async (langId) => {
        if (!langId || !COMPILERS[langId]) return;
        const compiler = COMPILERS[langId];
        const downloaded = await compiler.isDownloaded();
        setStatus(prev => ({ ...prev, isDownloaded: downloaded }));
    };

    useEffect(() => { checkCurrentCompiler(currentLang); }, [currentLang]);

    // Инициализация движка (WASM)
    useEffect(() => {
        const setupCompiler = async () => {
            if (!currentLang || !COMPILERS[currentLang]) return;
            const compiler = COMPILERS[currentLang];

            // 1. ЖЕСТКАЯ БЛОКИРОВКА (Используем проп isOnline, а не navigator!)
            const downloaded = await compiler.isDownloaded();

            // Если сервер недоступен (isOnline === false) и нет файлов в кэше:
            if (!isOnline && !downloaded) {
                setIsEngineReady(false);
                setOutput(`⚠️ ОФЛАЙН РЕЖИМ:\nДвижок "${compiler.name}" не загружен в память.\nПожалуйста, дождитесь подключения к серверу и скачайте движок.`);
                return; // ВЫХОДИМ! Никаких попыток загрузить wasm-файлы.
            }

            // 2. СТАНДАРТНАЯ ИНИЦИАЛИЗАЦИЯ
            setIsEngineReady(false);
            try {
                if (isOnline && !status.isDownloaded) {
                    setOutput(`⏳ Загрузка движка ${compiler.name} из сети...`);
                }

                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ Движок ${compiler.name} готов к работе.`);
            } catch (err) {
                setOutput(`❌ Ошибка инициализации:\n${err.message}`);
            }
        };

        if (!status.isDownloading) {
            setupCompiler();
        }
    }, [currentLang, status.isDownloaded, status.isDownloading, isOnline]);

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setCurrentLang(newLang);
        // Сохраняем только если нет лабы (свободный режим)
        if (!lab) localStorage.setItem(STORAGE_KEY, newLang);
        setIsEngineReady(false);
    };

    // НОВАЯ ФУНКЦИЯ: Очистка и установка примера кода
    const handleClearToTemplate = () => {
        if (editorInstanceRef.current && currentLang) {
            const template = COMPILERS[currentLang].template;
            // Установка через editorInstance заставит CodeEditor 
            // отправить событие изменения всем участникам через SignalR
            editorInstanceRef.current.setValue(template);
            setOutput("Код сброшен к шаблону примера.");
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

        // Если движок не готов (заблокирован из-за офлайна или еще грузится)
        if (!isEngineReady) {
            setOutput(`❌ Выполнение невозможно:\nДвижок не готов или недоступен в офлайн-режиме.`);
            return;
        }

        setOutput('Выполнение...');
        try {
            await COMPILERS[currentLang].run(editorInstanceRef.current.getValue(), setOutput);
        } catch (err) {
            setOutput(`❌ Ошибка выполнения:\n${err.message}`);
        }
    };

    const selectedCompiler = COMPILERS[currentLang];

    return (
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
            gap: 2, p: 2, bgcolor: '#0a0a0a',
            height: 'calc(100vh - 64px)', boxSizing: 'border-box', overflow: 'hidden'
        }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ */}
                <Paper sx={{
                    p: 1.5, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    bgcolor: '#141414', border: '1px solid #2a2a2a', borderRadius: 2
                }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel sx={{ color: '#888' }}>Среда</InputLabel>
                            <Select
                                value={currentLang} label="Среда" onChange={handleLangChange}
                                sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, bgcolor: '#1d1d1d' }}
                            >
                                <MenuItem value=""><em>Отключено</em></MenuItem>
                                {Object.values(COMPILERS).map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* КНОПКА СБРОСА КОДА */}
                        {currentLang && (
                            <Tooltip title="Сбросить код к примеру">
                                <IconButton
                                    onClick={handleClearToTemplate}
                                    sx={{ color: '#888', '&:hover': { color: '#fff', bgcolor: '#333' } }}
                                >
                                    <RestartAltIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {status.isDownloading && (
                            <Chip icon={<CircularProgress size={14} color="inherit" />} label={`${status.progress}%`} color="primary" variant="outlined" />
                        )}
                        {currentLang && !status.isDownloaded && !status.isDownloading && (
                            <Button variant="contained" size="small" startIcon={<CloudDownloadIcon />} onClick={handleDownload} sx={{ bgcolor: '#2e7d32' }}>
                                Скачать движок
                            </Button>
                        )}
                        {status.isDownloaded && (
                            <Chip icon={<CloudDoneIcon sx={{ color: '#4caf50 !important' }}/>} label="Offline" variant="outlined" sx={{ color: '#4caf50', borderColor: '#4caf50' }} />
                        )}
                    </Box>
                </Paper>

                {/* КОНТЕЙНЕР РЕДАКТОРА */}
                <Paper sx={{
                    flexGrow: 1, minHeight: 0, overflow: 'hidden', position: 'relative',
                    bgcolor: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 2
                }}>
                    {!currentLang && (
                        <Box sx={{
                            position: 'absolute', zIndex: 10, inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: 'rgba(10, 10, 10, 0.85)', backdropFilter: 'blur(4px)'
                        }}>
                            <Typography color="#888">Выберите язык программирования</Typography>
                        </Box>
                    )}
                    <CodeEditor
                        roomId={roomId}
                        language={selectedCompiler?.monacoLang || 'text'}
                        initialCode={initialCode}
                        onEditorReady={(editor) => {
                            editorInstanceRef.current = editor;

                            const observer = new ResizeObserver(() => editor.layout());
                            const container = document.getElementById('editor-container');
                            if (container) observer.observe(container);
                        }}
                    />
                </Paper>
            </Box>

            <Paper sx={{
                minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
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