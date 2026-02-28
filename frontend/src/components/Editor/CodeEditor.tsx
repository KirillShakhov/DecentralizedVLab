import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';

export default function CodeEditor({ roomId }) {
    const editorRef = useRef(null);
    const ydocRef = useRef(null);
    const connectionRef = useRef(null);

    const handleEditorDidMount = async (editor, monaco) => {
        editorRef.current = editor;
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        const ytext = ydoc.getText('monaco');

        // 1. Настройка подключения
        const connection = new HubConnectionBuilder()
            .withUrl('/sync-hub')
            .withAutomaticReconnect()
            .withHubProtocol(new MessagePackHubProtocol())
            .configureLogging(LogLevel.Information)
            .build();

        connectionRef.current = connection;

        // 2. Обработка входящих обновлений
        connection.on('ReceiveDocumentUpdate', (updateAsArray) => {
            console.log('Получено обновление из сети, байт:', updateAsArray.length);
            // Конвертируем массив чисел обратно в Uint8Array для Y.js
            const update = new Uint8Array(updateAsArray);
            Y.applyUpdate(ydoc, update, 'signalr');
        });

        try {
            await connection.start();
            console.log('SignalR подключен. Входим в комнату:', roomId);

            await connection.invoke('JoinRoom', roomId);

            // 3. Отправка локальных обновлений
            ydoc.on('update', (update, origin) => {
                if (origin !== 'signalr') {
                    console.log('Отправка локального изменения...');
                    // Передаем как массив, чтобы SignalR точно его переварил
                    connection.invoke('SendDocumentUpdate', roomId, Array.from(update))
                        .catch(err => console.error('Ошибка отправки:', err));
                }
            });

            // 4. Связка с Monaco
            new MonacoBinding(ytext, editorRef.current.getModel(), new Set([editorRef.current]));

        } catch (err) {
            console.error('Ошибка инициализации:', err);
        }
    };

    return (
        <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
            <Editor
                height="60vh"
                theme="vs-dark"
                defaultLanguage="python"
                onMount={handleEditorDidMount}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
            />
        </div>
    );
}