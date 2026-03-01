import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

function App() {
    const [roomId] = useState('lab-task-001');
    const [isOnline, setIsOnline] = useState(true);

    // Глобальная проверка доступности нашего бэкенда
    useEffect(() => {
        const checkServerStatus = async () => {
            if (!navigator.onLine) {
                setIsOnline(false);
                return;
            }
            try {
                await fetch('/', { method: 'HEAD', cache: 'no-store' });
                setIsOnline(true);
            } catch (error) {
                setIsOnline(false);
            }
        };

        checkServerStatus();
        const interval = setInterval(checkServerStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1e1e1e', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                <Header roomId={roomId} />

                {/* Индикатор сервера */}
                <div style={{
                    padding: '5px 15px',
                    borderRadius: '20px',
                    backgroundColor: isOnline ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                    color: isOnline ? '#10b981' : '#ef4444',
                    border: `1px solid ${isOnline ? '#10b981' : '#ef4444'}`,
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    {isOnline ? '● СЕРВЕР ДОСТУПЕН' : '○ РАБОТА БЕЗ СЕТИ'}
                </div>
            </div>

            <Workspace roomId={roomId} isOnline={isOnline} />
        </div>
    );
}

export default App;