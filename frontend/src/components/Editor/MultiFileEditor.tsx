import React, { useRef, useEffect, useCallback } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { Box, Tab, Tabs, IconButton, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

// ─── Язык по расширению файла ─────────────────────────────────────────────────

function monacoLang(filePath: string): string {
  const ext = filePath.split('.').pop() ?? ''
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript',
    lua: 'lua', sql: 'sql', java: 'java',
    json: 'json', md: 'markdown', html: 'html', css: 'css',
  }
  return map[ext] ?? 'plaintext'
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  yfiles: Y.Map<Y.Text>
  activeFile: string
  openFiles: string[]
  onCloseTab: (path: string) => void
  onSwitchTab: (path: string) => void
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export default function MultiFileEditor({
  yfiles, activeFile, openFiles, onCloseTab, onSwitchTab,
}: Props) {
  const editorRef = useRef<any>(null)
  // Кэш Monaco моделей: path → ITextModel
  const modelsRef = useRef<Map<string, any>>(new Map())
  // Кэш Yjs биндингов: path → MonacoBinding
  const bindingsRef = useRef<Map<string, MonacoBinding>>(new Map())
  const monaco = useMonaco()

  // Открывает файл в редакторе: создаёт/переиспользует модель + биндинг
  const openInEditor = useCallback((editor: any, monacoInstance: any, filePath: string) => {
    if (!filePath || !monacoInstance) return
    const ytext = yfiles.get(filePath)
    if (!ytext) return

    // Создаём Monaco модель, если нет
    if (!modelsRef.current.has(filePath)) {
      const lang = monacoLang(filePath)
      // Monaco URI чтобы не дублировать модели между mount/unmount
      const uri = monacoInstance.Uri.parse(`file:///${filePath}`)
      const existing = monacoInstance.editor.getModel(uri)
      const model = existing ?? monacoInstance.editor.createModel('', lang, uri)
      modelsRef.current.set(filePath, model)
    }

    const model = modelsRef.current.get(filePath)!

    // Создаём Yjs биндинг, если нет
    if (!bindingsRef.current.has(filePath)) {
      const binding = new MonacoBinding(ytext, model, new Set([editor]))
      bindingsRef.current.set(filePath, binding)
    }

    editor.setModel(model)
  }, [yfiles])

  // Когда activeFile меняется — переключаем модель
  useEffect(() => {
    if (editorRef.current && monaco && activeFile) {
      openInEditor(editorRef.current, monaco, activeFile)
    }
  }, [activeFile, monaco, openInEditor])

  // Когда yfiles меняется и в нём появляются новые файлы для открытых вкладок
  useEffect(() => {
    if (!editorRef.current || !monaco) return
    // Пересоздаём биндинг если ytext заменился (редкий кейс после rename)
    openFiles.forEach(path => {
      const ytext = yfiles.get(path)
      if (!ytext) return
      if (bindingsRef.current.has(path)) return
      openInEditor(editorRef.current, monaco, path)
    })
  }, [yfiles, openFiles, monaco, openInEditor])

  // Очищаем биндинги удалённых файлов
  useEffect(() => {
    const currentPaths = new Set(Array.from(yfiles.keys()))
    bindingsRef.current.forEach((binding, path) => {
      if (!currentPaths.has(path)) {
        binding.destroy()
        bindingsRef.current.delete(path)
        const model = modelsRef.current.get(path)
        if (model) { model.dispose(); modelsRef.current.delete(path) }
      }
    })
  }, [yfiles])

  const handleMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor
    if (activeFile) openInEditor(editor, monacoInstance, activeFile)
  }

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      bindingsRef.current.forEach(b => b.destroy())
      modelsRef.current.forEach(m => m.dispose())
      bindingsRef.current.clear()
      modelsRef.current.clear()
    }
  }, [])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e1e' }}>
      {/* Вкладки */}
      <Box sx={{
        borderBottom: '1px solid #2a2a2a', bgcolor: '#141414',
        display: 'flex', alignItems: 'center', minHeight: 36, overflowX: 'auto',
        flexShrink: 0,
      }}>
        {openFiles.map(path => {
          const isActive = path === activeFile
          return (
            <Box
              key={path}
              onClick={() => onSwitchTab(path)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                px: 1.5, py: 0.5, cursor: 'pointer', flexShrink: 0,
                borderRight: '1px solid #2a2a2a',
                bgcolor: isActive ? '#1e1e1e' : 'transparent',
                borderBottom: isActive ? '2px solid #2196f3' : '2px solid transparent',
                '&:hover .tab-close': { opacity: 1 },
                '&:hover': { bgcolor: isActive ? '#1e1e1e' : '#1a1a1a' },
              }}
            >
              <span style={{ fontSize: 12 }}>
                {path.split('.').pop() === 'py' ? '🐍' :
                 path.endsWith('.js') ? '🟨' :
                 path.endsWith('.lua') ? '🌙' :
                 path.endsWith('.sql') ? '🗄️' :
                 path.endsWith('.java') ? '☕' : '📄'}
              </span>
              <span style={{
                fontSize: 13,
                color: isActive ? '#e0e0e0' : '#888',
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {path}
              </span>
              {openFiles.length > 1 && (
                <IconButton
                  className="tab-close"
                  size="small"
                  onClick={e => { e.stopPropagation(); onCloseTab(path) }}
                  sx={{
                    opacity: 0, transition: 'opacity 0.15s',
                    p: 0.1, color: '#555', '&:hover': { color: '#ccc' },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Monaco Editor */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 15,
            lineHeight: 22,
            padding: { top: 12 },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
          }}
        />
      </Box>
    </Box>
  )
}
