import React, { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Select, MenuItem, FormControl, InputLabel,
    Button, Chip, Typography, CircularProgress, IconButton, Tooltip } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import Terminal from '../Terminal/Terminal';
import FileTree from '../FileTree/FileTree';
import MultiFileEditor from '../Editor/MultiFileEditor';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';
import { useYjsSession } from '../../hooks/useYjsSession';
import type { Lab } from '../../types';

const COMPILERS: Record<string, any> = {
    [PythonCompiler.id]: PythonCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler,
    [JavaCompiler.id]: JavaCompiler,
    [SQLiteCompiler.id]: SQLiteCompiler,
    [LuaCompiler.id]: LuaCompiler,
};

const STORAGE_KEY = 'vlab_selected_compiler';

interface WorkspaceProps {
    roomId: string;
    isOnline: boolean;
    lab?: Lab;
}

export default function Workspace({ roomId, isOnline, lab }: WorkspaceProps) {
    // Язык из лабы или из localStorage
    const [currentLang, setCurrentLang] = useState(() =>
        lab?.language ?? localStorage.getItem(STORAGE_KEY) ?? ''
    );
    const [output, setOutput] = useState(currentLang ? 'Подключение к комнате...' : 'Выберите язык');
    const [isEngineReady, setIsEngineReady] = useState(false);
    const [status, setStatus] = useState({ isDownloaded: false, isDownloading: false, progress: 0 });
    // Открытые вкладки редактора
    const [openFiles, setOpenFiles] = useState<string[]>([]);

    // Начальные файлы из лабы
    const initialFiles: Record<string, string> = lab?.files
        ? Object.fromEntries(lab.files.map(f => [f.path, f.content]))
        : {};

    // Y.Doc сессия: файлы + SignalR
    const {
        yfiles, fileList, activeFile, setActiveFile,
        addFile, deleteFile, getFiles,
    } = useYjsSession(roomId, isOnline, initialFiles);

    // Синхронизируем открытые вкладки с fileList
    useEffect(() => {
        if (fileList.length === 0) return;
        setOpenFiles(prev => {
            const validOpen = prev.filter(p => fileList.includes(p));
            // Открываем activeFile если его нет во вкладках
            const merged = validOpen.includes(activeFile) || !activeFile
                ? validOpen
                : [...validOpen, activeFile];
            return merged.length > 0 ? merged : [fileList[0]];
        });
    }, [fileList, activeFile]);

    // ── Компилятор ───────────────────────────────────────────────────────────

    const checkCompiler = useCallback(async (langId: string) => {
        if (!langId || !COMPILERS[langId]) return;
        const downloaded = await COMPILERS[langId].isDownloaded();
        setStatus(prev => ({ ...prev, isDownloaded: downloaded }));
    }, []);

    useEffect(() => { checkCompiler(currentLang); }, [currentLang, checkCompiler]);

    useEffect(() => {
        const setup = async () => {
            if (!currentLang || !COMPILERS[currentLang]) return;
            const compiler = COMPILERS[currentLang];
            const downloaded = await compiler.isDownloaded();

            if (!isOnline && !downloaded) {
                setIsEngineReady(false);
                setOutput(`⚠️ ОФЛАЙН РЕЖИМ:\nДвижок "${compiler.name}" не загружен.\nПодключитесь к серверу и нажмите "Скачать движок".`);
                return;
            }

            setIsEngineReady(false);
            try {
                if (isOnline && !downloaded) setOutput(`⏳ Загрузка ${compiler.name}...`);
                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ ${compiler.name} готов к работе.`);
            } catch (err: any) {
                setOutput(`❌ Ошибка инициализации:\n${err.message}`);
            }
        };

        if (!status.isDownloading) setup();
    }, [currentLang, status.isDownloaded, status.isDownloading, isOnline]);

    const handleLangChange = (e: any) => {
        const lang = e.target.value;
        setCurrentLang(lang);
        if (!lab) localStorage.setItem(STORAGE_KEY, lang);
        setIsEngineReady(false);
    };

    const handleDownload = async () => {
        if (!currentLang) return;
        setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
        try {
            await COMPILERS[currentLang].downloadForOffline(
                (p: number) => setStatus(prev => ({ ...prev, progress: p }))
            );
            await checkCompiler(currentLang);
        } catch { alert('Ошибка загрузки'); }
        finally { setStatus(prev => ({ ...prev, isDownloading: false })); }
    };

    const handleReset = () => {
        if (!lab?.files?.[0]) return;
        // Сбрасываем первый файл к шаблону лабы
        const ytext = yfiles.get(lab.files[0].path);
        if (!ytext) return;
        ytext.delete(0, ytext.length);
        ytext.insert(0, lab.files[0].content);
        setOutput('Код сброшен к шаблону.');
    };

    const runCode = async () => {
        if (!isEngineReady) {
            setOutput('❌ Движок не готов. Дождитесь инициализации.');
            return;
        }
        setOutput('⏳ Выполнение...');
        try {
            const files = getFiles();
            await COMPILERS[currentLang].run(files, setOutput);
        } catch (err: any) {
            setOutput(`❌ Ошибка выполнения:\n${err.message}`);
        }
    };

    // ── Управление вкладками ─────────────────────────────────────────────────

    const handleSwitchTab = (path: string) => {
        setActiveFile(path);
        if (!openFiles.includes(path)) {
            setOpenFiles(prev => [...prev, path]);
        }
    };

    const handleSelectFile = (path: string) => {
        setActiveFile(path);
        if (!openFiles.includes(path)) {
            setOpenFiles(prev => [...prev, path]);
        }
    };

    const handleCloseTab = (path: string) => {
        setOpenFiles(prev => {
            const next = prev.filter(p => p !== path);
            if (path === activeFile && next.length > 0) {
                setActiveFile(next[next.length - 1]);
            }
            return next;
        });
    };

    const handleAddFile = (path: string) => {
        addFile(path, '');
        setOpenFiles(prev => prev.includes(path) ? prev : [...prev, path]);
    };

    const selectedCompiler = COMPILERS[currentLang];
    const readOnlyFiles = lab?.files?.filter(f => f.readOnly).map(f => f.path) ?? [];

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 64px)', bgcolor: '#0a0a0a', overflow: 'hidden',
        }}>
            {/* Панель управления */}
            <Paper sx={{
                px: 2, py: 1, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: '#141414', borderRadius: 0, borderBottom: '1px solid #2a2a2a',
            }}>
                {/* Левая часть: название лабы + язык */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {lab && (
                        <Typography variant="body2" fontWeight="bold" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                            {lab.title}
                        </Typography>
                    )}

                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel sx={{ color: '#888' }}>Язык / Среда</InputLabel>
                        <Select
                            value={currentLang}
                            label="Язык / Среда"
                            onChange={handleLangChange}
                            disabled={!!lab} // В лабораторной язык фиксирован
                            sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#333' }, bgcolor: '#1d1d1d' }}
                        >
                            <MenuItem value=""><em>Отключено</em></MenuItem>
                            {Object.values(COMPILERS).map((c: any) => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {lab && (
                        <Tooltip title="Сбросить к шаблону">
                            <IconButton size="small" onClick={handleReset} sx={{ color: '#666', '&:hover': { color: '#fff' } }}>
                                <RestartAltIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                {/* Правая часть: статус загрузки двжка */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {status.isDownloading && (
                        <Chip
                            icon={<CircularProgress size={14} color="inherit" />}
                            label={`${status.progress}%`}
                            color="primary" variant="outlined"
                        />
                    )}
                    {currentLang && !status.isDownloaded && !status.isDownloading && (
                        <Button variant="contained" size="small" startIcon={<CloudDownloadIcon />}
                            onClick={handleDownload} sx={{ bgcolor: '#2e7d32' }}>
                            Скачать движок
                        </Button>
                    )}
                    {status.isDownloaded && (
                        <Chip
                            icon={<CloudDoneIcon sx={{ color: '#4caf50 !important' }} />}
                            label="Offline"
                            variant="outlined"
                            sx={{ color: '#4caf50', borderColor: '#4caf50' }}
                        />
                    )}
                </Box>
            </Paper>

            {/* Основная область: FileTree | Editor | Terminal */}
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>

                {/* FileTree */}
                <Box sx={{ width: 200, flexShrink: 0, minHeight: 0 }}>
                    <FileTree
                        fileList={fileList}
                        activeFile={activeFile}
                        readOnlyFiles={readOnlyFiles}
                        onSelect={handleSelectFile}
                        onAdd={handleAddFile}
                        onDelete={deleteFile}
                    />
                </Box>

                {/* Monaco Editor */}
                <Box sx={{ flexGrow: 1, minWidth: 0, minHeight: 0, borderRight: '1px solid #2a2a2a' }}>
                    {!currentLang && (
                        <Box sx={{
                            height: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', bgcolor: '#1e1e1e',
                        }}>
                            <Typography color="text.secondary">Выберите язык программирования</Typography>
                        </Box>
                    )}
                    {currentLang && (
                        <MultiFileEditor
                            yfiles={yfiles}
                            activeFile={activeFile}
                            openFiles={openFiles.length > 0 ? openFiles : fileList.slice(0, 1)}
                            onSwitchTab={handleSwitchTab}
                            onCloseTab={handleCloseTab}
                        />
                    )}
                </Box>

                {/* Terminal */}
                <Box sx={{ width: 320, flexShrink: 0, bgcolor: '#000', minHeight: 0 }}>
                    <Terminal
                        output={output}
                        isWasmReady={isEngineReady}
                        onRunCode={runCode}
                    />
                </Box>
            </Box>
        </Box>
    );
}
