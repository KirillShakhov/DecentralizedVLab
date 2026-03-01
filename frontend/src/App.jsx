import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

function App() {
    const [roomId] = useState('lab-task-001');
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        let interval;

        const checkServerStatus = async () => {
            // Если даже Wi-Fi отключен, сразу ставим офлайн
            if (!navigator.onLine) {
                setIsOnline(false);
                return;
            }

            try {
                // Пытаемся достучаться до нашего сервера (делаем легкий HEAD запрос)
                // Если Docker выключен, запрос упадет с ошибкой
                await fetch('/', { method: 'HEAD', cache: 'no-store' });
                setIsOnline(true);
            } catch (error) {
                // Сервер недоступен!
                setIsOnline(false);
            }
        };

        // Проверяем статус при загрузке
        checkServerStatus();

        // Запускаем проверку каждые 5 секунд
        interval = setInterval(checkServerStatus, 5000);

        // Оставляем слушатели на случай физического отключения кабеля
        window.addEventListener('online', checkServerStatus);
        window.addEventListener('offline', () => setIsOnline(false));

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', checkServerStatus);
            window.removeEventListener('offline', () => setIsOnline(false));
        };
    }, []);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Header roomId={roomId} />
                <div style={{
                    padding: '5px 15px',
                    borderRadius: '20px',
                    backgroundColor: isOnline ? '#004d00' : '#4d0000',
                    color: isOnline ? '#00ff00' : '#ff3333',
                    border: `1px solid ${isOnline ? '#00ff00' : '#ff3333'}`,
                    fontWeight: 'bold',
                    fontSize: '14px'
                }}>
                    {isOnline ? '● ONLINE' : '○ OFFLINE MODE'}
                </div>
            </div>
            <Workspace roomId={roomId} />
        </div>
    );
}

export default App;