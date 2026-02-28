import React, { useState } from 'react';
import CodeEditor from './components/Editor/CodeEditor';

function App() {
    const [roomId] = useState('lab-task-001'); // Уникальный ID комнаты/задачи

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
            <header style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                <h1>Децентрализованная В-Лаборатория</h1>
                <p style={{ color: '#888' }}>Режим: Совместное программирование | Комната: {roomId}</p>
            </header>

            <main style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                {/* Левая колонка - Редактор кода */}
                <section>
                    <CodeEditor roomId={roomId} />
                </section>

                {/* Правая колонка - Терминал / Вывод WASM */}
                <section style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '15px', border: '1px solid #333' }}>
                    <h3>Консоль (WASM Edge)</h3>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        // Здесь будет вывод компилятора WebAssembly.<br/>
                        // Выполняется локально в браузере. Сервер не задействован.
                    </p>
                    <button
                        style={{
                            marginTop: '10px', padding: '10px 15px',
                            backgroundColor: '#007acc', color: 'white',
                            border: 'none', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        ▶ Запустить код
                    </button>
                </section>
            </main>
        </div>
    );
}

export default App;