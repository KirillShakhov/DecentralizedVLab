import React from 'react';

export default function Header({ roomId }) {
    return (
        <header style={{ marginBottom: '20px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
            <h1>Децентрализованная В-Лаборатория</h1>
            <p style={{ color: '#888' }}>Режим: Совместное программирование | Комната: {roomId}</p>
        </header>
    );
}