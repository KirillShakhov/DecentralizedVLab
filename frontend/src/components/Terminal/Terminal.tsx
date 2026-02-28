import React from 'react';

export default function Terminal({ output, isWasmReady, onRunCode }) {
    return (
        <section style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '15px', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
            <h3>Консоль (WASM Edge)</h3>

            <div style={{ flex: 1, backgroundColor: '#000', color: '#0f0', padding: '10px', borderRadius: '5px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflowY: 'auto', marginBottom: '15px' }}>
                {output}
            </div>

            <button
                onClick={onRunCode}
                disabled={!isWasmReady}
                style={{
                    padding: '12px 15px',
                    backgroundColor: isWasmReady ? '#007acc' : '#444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isWasmReady ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold'
                }}
            >
                {isWasmReady ? '▶ Запустить локально (WASM)' : 'Загрузка рантайма...'}
            </button>
        </section>
    );
}