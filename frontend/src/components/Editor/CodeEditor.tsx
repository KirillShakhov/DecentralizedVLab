import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';


export default function CodeEditor({ roomId, language, onEditorReady }) {
    const editorRef = useRef(null);
    const ydocRef = useRef(null);
    const connectionRef = useRef(null);

    const handleEditorDidMount = async (editor, monaco) => {
        editorRef.current = editor;

        if (onEditorReady) {
            onEditorReady(editor);
        }

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        const ytext = ydoc.getText('monaco');

        const connection = new HubConnectionBuilder()
            .withUrl('/sync-hub')
            .withAutomaticReconnect()
            .withHubProtocol(new MessagePackHubProtocol())
            .configureLogging(LogLevel.Information)
            .build();

        connectionRef.current = connection;

        connection.on('UserJoined', (connectionId) => {
            console.log(`[Комната] Подключился новый участник: ${connectionId}`);
        });

        connection.on('UserLeft', (connectionId) => {
            console.log(`[Комната] Участник покинул лабораторию: ${connectionId}`);
        });

        connection.on('ReceiveDocumentUpdate', (updateAsArray) => {
            const update = new Uint8Array(updateAsArray);
            Y.applyUpdate(ydoc, update, 'signalr');
        });

        try {
            await connection.start();
            await connection.invoke('JoinRoom', roomId);

            ydoc.on('update', (update, origin) => {
                if (origin !== 'signalr') {
                    connection.invoke('SendDocumentUpdate', roomId, update)
                        .catch(err => console.error('Ошибка отправки:', err));
                }
            });

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
                language={language}
                onMount={handleEditorDidMount}
                options={{ minimap: { enabled: false }, fontSize: 16 }}
            />
        </div>
    );
}