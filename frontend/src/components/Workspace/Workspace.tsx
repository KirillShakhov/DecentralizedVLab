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

    // Гранулярные состояния для ТЕКУЩЕГО компилятора
    const [compilerStatus, setCompilerStatus] = useState({
        isDownloaded: false,
        hasUpdate: false,
        isDownloading: false,
        progress: 0
    });

    const editorInstanceRef = useRef(null);

    // Проверка статуса текущего компилятора
    const checkCurrentCompiler = async (langId) => {
        const compiler = COMPILERS[langId];
        const downloaded = await compiler.isDownloaded();
        let updateAvailable = false;

        // Проверяем обновления, только если он уже скачан и есть сеть
        if (downloaded && isOnline) {
            updateAvailable = await compiler.checkForUpdates();
        }

        setCompilerStatus(prev => ({
            ...prev,
            isDownloaded: downloaded,
            hasUpdate: updateAvailable
        }));
    };

    // Инициализация движка при смене языка
    useEffect(() => {
        const setupCompiler = async () => {
            setIsEngineReady(false);
            const compiler = COMPILERS[currentLang];

            await checkCurrentCompiler(currentLang);

            try {
                setOutput(`Инициализация движка ${compiler.name}...`);
                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ Среда ${compiler.name} готова!`);
            } catch (err) {
                if (err.message.includes('не скачан')) {
                    setOutput(`⚠️ Компилятор ${compiler.name} не установлен для офлайн-работы. Нажмите "Скачать".`);
                } else {
                    setOutput(`❌ Ошибка инициализации: ${err.message}`);
                }
            }
        };

        setupCompiler();

        // Периодическая проверка обновлений (раз в 30 сек)
        const interval = setInterval(() => checkCurrentCompiler(currentLang), 30000);
        return () => clearInterval(interval);
    }, [currentLang, isOnline]);

    const handleLangChange = (e) => {
        const newLang = e.target.value;
        setCurrentLang(newLang);
        if (editorInstanceRef.current && editorInstanceRef.current.getModel()) {
            editorInstanceRef.current.setValue(COMPILERS[newLang].template);
        }
    };

    const runCode = async () => {
        if (!editorInstanceRef.current) return;
        setOutput('Выполнение...');
        try {
            await COMPILERS[currentLang].run(editorInstanceRef.current.getValue(), setOutput);
        } catch (err) {
            setOutput(`❌ Ошибка выполнения:\n${err.toString()}`);
        }
    };

    // Действия с компилятором
    const handleDownloadOrUpdate = async () => {
        setCompilerStatus(prev => ({ ...prev, isDownloading: true, progress: 0 }));
        try {
            await COMPILERS[currentLang].downloadForOffline((p) => {
                setCompilerStatus(prev => ({ ...prev, progress: p }));
            });

            // Если это было обновление, перезагружаем страницу для чистого старта WASM
            if (compilerStatus.hasUpdate) {
                window.location.reload();
            } else {
                await checkCurrentCompiler(currentLang);
                // Пробуем запустить инициализацию снова, раз уж скачали
                await COMPILERS[currentLang].init();
                setIsEngineReady(true);
                setOutput(`✅ Среда ${COMPILERS[currentLang].name} успешно загружена и готова!`);
            }
        } catch (e) {
            alert("Ошибка сети при загрузке компилятора.");
        } finally {
            setCompilerStatus(prev => ({ ...prev, isDownloading: false }));
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`Удалить компилятор ${COMPILERS[currentLang].name} с устройства?`)) {
            await COMPILERS[currentLang].removeOffline();
            await checkCurrentCompiler(currentLang);
            setOutput(`🗑️ Движок ${COMPILERS[currentLang].name} удален из памяти.`);
        }
    };

    return (
        <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* ПАНЕЛЬ УПРАВЛЕНИЯ ТЕКУЩИМ КОМПИЛЯТОРОМ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '10px', borderRadius: '8px' }}>
                    <div>
                        <span style={{ marginRight: '10px', color: '#aaa' }}>Движок:</span>
                        <select
                            value={currentLang}
                            onChange={handleLangChange}
                            style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
                        >
                            {Object.values(COMPILERS).map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Индивидуальные элементы управления компилятором */}
                    {currentLang !== 'javascript' && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                            {compilerStatus.isDownloading && (
                                <span style={{ color: '#3b82f6', fontSize: '14px' }}>Грузим... {compilerStatus.progress}%</span>
                            )}

                            {/* Если не скачан */}
                            {!compilerStatus.isDownloaded && !compilerStatus.isDownloading && (
                                <button onClick={handleDownloadOrUpdate} style={{ padding: '6px 12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                    ☁️ Скачать
                                </button>
                            )}

                            {/* Если скачан и есть обнова */}
                            {compilerStatus.isDownloaded && compilerStatus.hasUpdate && !compilerStatus.isDownloading && (
                                <button onClick={handleDownloadOrUpdate} style={{ padding: '6px 12px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                                    🔄 Обновить
                                </button>
                            )}

                            {/* Если скачан (можно удалить) */}
                            {compilerStatus.isDownloaded && !compilerStatus.isDownloading && (
                                <>
                  <span style={{ color: '#10b981', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                    💾 Доступен офлайн
                  </span>
                                    <button onClick={handleDelete} title="Удалить с устройства" style={{ padding: '6px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer' }}>
                                        🗑️
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <CodeEditor
                    roomId={roomId}
                    language={COMPILERS[currentLang].monacoLang}
                    onEditorReady={(editor) => {
                        editorInstanceRef.current = editor;
                        if (editor.getValue() === '') {
                            editor.setValue(COMPILERS[currentLang].template);
                        }
                    }}
                />
            </section>

            <Terminal output={output} isWasmReady={isEngineReady} onRunCode={runCode} />
        </main>
    );
}