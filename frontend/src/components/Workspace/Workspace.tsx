import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';

const COMPILERS = {
    [PythonCompiler.id]: PythonCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler
};

export default function Workspace({ roomId, isOnline }) {
    const [currentLang, setCurrentLang] = useState(PythonCompiler.id);
    const [output, setOutput] = useState('Выберите компилятор...');
    const [isEngineReady, setIsEngineReady] = useState(false);

    // Состояния текущего компилятора
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
        <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ КОМПИЛЯТОРОМ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '8px', border: '1px solid #333' }}>
                    <div>
                        <select value={currentLang} onChange={handleLangChange} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
                            {Object.values(COMPILERS).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    {currentLang !== 'javascript' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            {status.isDownloading && <span style={{ color: '#3b82f6', fontSize: '13px' }}>Грузим... {status.progress}%</span>}

                            {!status.isDownloaded && !status.isDownloading && (
                                <button onClick={handleDownload} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                    ⬇️ Скачать компилятор
                                </button>
                            )}

                            {status.isDownloaded && !status.hasUpdate && !status.isDownloading && (
                                <span style={{ color: '#10b981', fontSize: '13px' }}>💾 Сохранен локально</span>
                            )}

                            {status.isDownloaded && status.hasUpdate && isOnline && !status.isDownloading && (
                                <button onClick={handleUpdate} style={{ padding: '6px 12px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                    🔄 Обновить
                                </button>
                            )}

                            {status.isDownloaded && !status.isDownloading && (
                                <button onClick={handleDelete} title="Удалить" style={{ padding: '5px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                            )}
                        </div>
                    )}
                </div>

                <CodeEditor
                    roomId={roomId}
                    language={COMPILERS[currentLang].monacoLang}
                    onEditorReady={(editor) => {
                        editorInstanceRef.current = editor;
                        if (editor.getValue() === '') editor.setValue(COMPILERS[currentLang].template);
                    }}
                />
            </section>

            <Terminal output={output} isWasmReady={isEngineReady} onRunCode={runCode} />
        </main>
    );
}