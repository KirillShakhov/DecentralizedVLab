import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../Editor/CodeEditor';
import Terminal from '../Terminal/Terminal';

export default function Workspace({ roomId }) {
    const [output, setOutput] = useState('Инициализация WebAssembly...');
    const [isWasmReady, setIsWasmReady] = useState(false);
    const pyodideRef = useRef(null);
    const editorInstanceRef = useRef(null);

    useEffect(() => {
        const loadWasm = async () => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
            script.async = true;
            script.onload = async () => {
                pyodideRef.current = await window.loadPyodide();
                setIsWasmReady(true);
                setOutput('✅ WASM Python загружен и готов к локальному выполнению!');
            };
            document.body.appendChild(script);
        };
        loadWasm();
    }, []);

    const runCode = async () => {
        if (!pyodideRef.current || !editorInstanceRef.current) return;

        setOutput('Выполнение...');
        const codeToRun = editorInstanceRef.current.getValue();

        try {
            await pyodideRef.current.runPythonAsync(`
        import sys
        import io
        sys.stdout = io.StringIO()
      `);

            await pyodideRef.current.runPythonAsync(codeToRun);
            const stdout = await pyodideRef.current.runPythonAsync("sys.stdout.getvalue()");
            setOutput(stdout || 'Программа выполнена (нет вывода)');

        } catch (err) {
            setOutput(`❌ Ошибка выполнения:\n${err.toString()}`);
        }
    };

    return (
        <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            <section>
                <CodeEditor roomId={roomId} onEditorReady={(editor) => editorInstanceRef.current = editor} />
            </section>

            <Terminal
                output={output}
                isWasmReady={isWasmReady}
                onRunCode={runCode}
            />
        </main>
    );
}