import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';
import { JavaCompiler } from '../../compilers/java';
import { SQLiteCompiler } from '../../compilers/sqlite';
import { LuaCompiler } from '../../compilers/lua';

// Импорты MUI
import { Box, Paper, Select, MenuItem, FormControl, InputLabel, Button, Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudDoneIcon from '@mui/icons-material/CloudDone';

const COMPILERS = {
    [PythonCompiler.id]: PythonCompiler,
    [JavaCompiler.id]: JavaCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler,
    [SQLiteCompiler.id]: SQLiteCompiler,
    [LuaCompiler.id]: LuaCompiler
};

export default function Workspace({ roomId, isOnline }) {
    const [currentLang, setCurrentLang] = useState(PythonCompiler.id);
    const [output, setOutput] = useState('Выберите компилятор...');
    const [isEngineReady, setIsEngineReady] = useState(false);

    const [status, setStatus] = useState({
        isDownloaded: false,
        hasUpdate: false,
        isDownloading: false,
        progress: 0
    });

    const editorInstanceRef = useRef(null);

    const checkCurrentCompiler = async (langId) => {
        if (langId === 'javascript') {
            setStatus({ isDownloaded: true, hasUpdate: false, isDownloading: false, progress: 0 });
            return;
        }
        const compiler = COMPILERS[langId];
        const downloaded = await compiler.isDownloaded();
        let updateAvailable = false;
        if (downloaded && isOnline) {
            updateAvailable = await compiler.checkForUpdates();
        }
        setStatus(prev => ({ ...prev, isDownloaded: downloaded, hasUpdate: updateAvailable }));
    };

    useEffect(() => {
        checkCurrentCompiler(currentLang);
        const interval = setInterval(() => checkCurrentCompiler(currentLang), 30000);
        return () => clearInterval(interval);
    }, [currentLang, isOnline]);

    useEffect(() => {
        const setupCompiler = async () => {
            setIsEngineReady(false);
            const compiler = COMPILERS[currentLang];
            try {
                setOutput(`Инициализация движка ${compiler.name}...`);
                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ Среда ${compiler.name} готова!`);
            } catch (err) {
                setOutput(`⚠️ ${err.message}`);
            }
        };
        if (!status.isDownloading) setupCompiler();
    }, [currentLang, status.isDownloaded, status.isDownloading]);

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setCurrentLang(newLang);
        if (editorInstanceRef.current && editorInstanceRef.current.getModel()) {
            editorInstanceRef.current.setValue(COMPILERS[newLang].template);
        }
    };

    const handleDownload = async () => {
        setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
        try {
            await COMPILERS[currentLang].downloadForOffline(p => setStatus(prev => ({ ...prev, progress: p })));
            await checkCurrentCompiler(currentLang);
        } catch (e) {
            alert("Ошибка скачивания.");
        } finally {
            setStatus(prev => ({ ...prev, isDownloading: false }));
        }
    };

    const handleUpdate = async () => {
        setStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
        try {
            await COMPILERS[currentLang].downloadForOffline(p => setStatus(prev => ({ ...prev, progress: p })));
            window.location.reload();
        } catch (e) {
            alert("Ошибка обновления.");
            setStatus(prev => ({ ...prev, isDownloading: false }));
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Удалить компилятор с устройства?")) {
            await COMPILERS[currentLang].removeOffline();
            await checkCurrentCompiler(currentLang);
            setOutput(`🗑️ Движок удален.`);
            setIsEngineReady(false);
        }
    };

    const runCode = async () => {
        if (!editorInstanceRef.current) return;
        setOutput('Выполнение...');
        try {
            await COMPILERS[currentLang].run(editorInstanceRef.current.getValue(), setOutput);
        } catch (err) {
            setOutput(`❌ Ошибка: ${err.message}`);
        }
    };

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3, flexGrow: 1 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ КОМПИЛЯТОРОМ (MUI Paper) */}
                <Paper elevation={2} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Движок</InputLabel>
                        <Select value={currentLang} label="Движок" onChange={handleLangChange}>
                            {Object.values(COMPILERS).map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {currentLang !== 'javascript' && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>

                            {status.isDownloading && (
                                <Chip icon={<CircularProgress size={16} />} label={`Грузим... ${status.progress}%`} color="primary" variant="outlined" />
                            )}

                            {!status.isDownloaded && !status.isDownloading && (
                                <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={handleDownload}>
                                    Скачать движок
                                </Button>
                            )}

                            {status.isDownloaded && !status.hasUpdate && !status.isDownloading && (
                                <Chip icon={<CloudDoneIcon />} label="Готов к офлайну" color="success" variant="outlined" />
                            )}

                            {status.isDownloaded && status.hasUpdate && isOnline && !status.isDownloading && (
                                <Button variant="contained" color="warning" startIcon={<SyncIcon />} onClick={handleUpdate}>
                                    Обновить
                                </Button>
                            )}

                            {status.isDownloaded && !status.isDownloading && (
                                <Tooltip title="Удалить компилятор">
                                    <IconButton color="error" onClick={handleDelete}>
                                        <DeleteIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                    )}
                </Paper>

                <Paper elevation={2} sx={{ flexGrow: 1, overflow: 'hidden', p: 1 }}>
                    <CodeEditor
                        roomId={roomId}
                        language={COMPILERS[currentLang].monacoLang}
                        onEditorReady={(editor) => {
                            editorInstanceRef.current = editor;
                            if (editor.getValue() === '') editor.setValue(COMPILERS[currentLang].template);
                        }}
                    />
                </Paper>
            </Box>

            <Paper elevation={2} sx={{ overflow: 'hidden' }}>
                <Terminal output={output} isWasmReady={isEngineReady} onRunCode={runCode} />
            </Paper>
        </Box>
    );
}