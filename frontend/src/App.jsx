import React, { useState } from 'react';
import Header from './components/Header/Header';
import Workspace from './components/Workspace/Workspace';

function App() {
    const [roomId] = useState('lab-task-001');

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh' }}>
            <Header roomId={roomId} />
            <Workspace roomId={roomId} />
        </div>
    );
}

export default App;