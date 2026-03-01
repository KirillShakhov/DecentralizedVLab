import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';
import { PythonCompiler } from '../../compilers/python';
import { JavascriptCompiler } from '../../compilers/javascript';

const COMPILERS = {
    [PythonCompiler.id]: PythonCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler
};

export default function Workspace({ roomId }) {
    const [currentLang, setCurrentLang] = useState(PythonCompiler.id);
    const [output, setOutput] = useState('Выберите компилятор...');
    const [isEngineReady, setIsEngineReady] = useState(false);

    // Состояния для офлайн-загрузки
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    const editorInstanceRef = useRef(null);

    // Смена компилятора
    useEffect(() => {
        const setupCompiler = async () => {
            setIsEngineReady(false);
            const compiler = COMPILERS[currentLang];

            // Проверяем, скачан ли он уже
            const downloaded = await compiler.isDownloaded();
            setIsOfflineReady(downloaded);

            // Инициализируем (если уже скачан или есть сеть)
            try {
                setOutput(`Инициализация движка ${compiler.name}...`);
                await compiler.init();
                setIsEngineReady(true);
                setOutput(`✅ Среда ${compiler.name} готова!`);
            } catch (err) {
                setOutput(`❌ Ошибка инициализации: ${err.message}`);
            }
        };

        setupCompiler();
    }, [currentLang]);

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
        const codeToRun = editorInstanceRef.current.getValue();

        try {
            await COMPILERS[currentLang].run(codeToRun, setOutput);
        } catch (err) {
            setOutput(`❌ Ошибка выполнения:\n${err.toString()}`);
        }
    };

    const downloadCompiler = async () => {
        setIsDownloading(true);
        setDownloadProgress(0);
        try {
            await COMPILERS[currentLang].downloadForOffline(setDownloadProgress);
            setIsOfflineReady(true);
        } catch (err) {
            alert("Ошибка при скачивании компилятора. Проверьте сеть.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                {/* Панель управления компиляторами */}
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

                    {/* Кнопка скачивания для PWA */}
                    <div>
                        {!isOfflineReady && !isDownloading && (
                            <button onClick={downloadCompiler} style={{ padding: '8px 12px', backgroundColor: '#007acc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                ⬇️ Скачать для офлайн
                            </button>
                        )}
                        {isDownloading && (
                            <span style={{ color: '#00ff00' }}>Скачивание... {downloadProgress}%</span>
                        )}
                        {isOfflineReady && (
                            <span style={{ color: '#00ff00', fontSize: '14px' }}>✅ Доступно офлайн</span>
                        )}
                    </div>
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

            <Terminal
                output={output}
                isWasmReady={isEngineReady}
                onRunCode={runCode}
            />
        </main>
    );
}