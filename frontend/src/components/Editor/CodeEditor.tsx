import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

export default function CodeEditor({ roomId }) {
    const [code, setCode] = useState('# Напиши свой код здесь...\nprint("Hello, V-Lab!")');

    const handleEditorDidMount = (editor, monaco) => {
        console.log('Редактор смонтирован. Готов к привязке CRDT для комнаты:', roomId);
        // На следующем этапе мы здесь свяжем Y.js, Monaco и SignalR
    };

    return (
        <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
            <Editor
                height="60vh"
                theme="vs-dark"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value)}
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 16,
                    wordWrap: 'on',
                }}
            />
        </div>
    );
}