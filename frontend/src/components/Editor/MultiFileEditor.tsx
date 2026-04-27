import React, { useRef, useEffect, useCallback, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import { Box, IconButton } from '@mui/material'
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
  const [filesVersion, setFilesVersion] = useState(0)
  const resolvedActiveFile = activeFile || openFiles[0] || ''
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  // Кэш Monaco моделей: path → ITextModel
  const modelsRef = useRef<Map<string, any>>(new Map())
  // Держим только один активный биндинг для текущего файла
  const activeBindingRef = useRef<MonacoBinding | null>(null)
  const activeBindingPathRef = useRef<string>('')

  const disposeActiveBinding = useCallback(() => {
    if (activeBindingRef.current) {
      activeBindingRef.current.destroy()
      activeBindingRef.current = null
      activeBindingPathRef.current = ''
    }
  }, [])

  // Y.Map мутируется без смены reference — поэтому отслеживаем изменения через observer
  useEffect(() => {
    const bumpVersion = () => setFilesVersion(v => v + 1)
    yfiles.observe(bumpVersion)
    return () => yfiles.unobserve(bumpVersion)
  }, [yfiles])

  // Открывает файл в редакторе: создаёт/переиспользует модель + биндинг
  const openInEditor = useCallback((editor: any, monacoInstance: any, filePath: string) => {
    if (!filePath || !monacoInstance) return
    const ytext = yfiles.get(filePath)
    if (!ytext) return

    const lang = monacoLang(filePath)
    const ytextValue = ytext.toString()

    // Создаём Monaco модель, если нет
    if (!modelsRef.current.has(filePath)) {
      // Monaco URI чтобы не дублировать модели между mount/unmount
      const uri = monacoInstance.Uri.parse(`file:///${filePath}`)
      const existing = monacoInstance.editor.getModel(uri)
      const model = existing ?? monacoInstance.editor.createModel(ytextValue, lang, uri)
      if (existing && existing.getLanguageId() !== lang) {
        monacoInstance.editor.setModelLanguage(existing, lang)
      }
      if (existing && existing.getValue() !== ytextValue) {
        existing.setValue(ytextValue)
      }
      modelsRef.current.set(filePath, model)
    }

    const model = modelsRef.current.get(filePath)!
    if (model.getLanguageId() !== lang) {
      monacoInstance.editor.setModelLanguage(model, lang)
    }

    // На случай если файл обновился вне модели (например, через Yjs до первого открытия)
    if (model.getValue() !== ytextValue) {
      model.setValue(ytextValue)
    }

    // Важно: сначала переключаем model у editor, затем создаём binding
    editor.setModel(model)

    if (activeBindingPathRef.current === filePath && activeBindingRef.current) {
      return
    }

    disposeActiveBinding()
    activeBindingRef.current = new MonacoBinding(ytext, model, new Set([editor]))
    activeBindingPathRef.current = filePath

    // Жестко синхронизируем видимую модель из Y.Text сразу после bind.
    // Это устраняет редкий стартовый race, когда редактор визуально пуст до первого tab switch.
    const syncedValue = ytext.toString()
    if (model.getValue() !== syncedValue) {
      model.setValue(syncedValue)
    }
  }, [yfiles, disposeActiveBinding])

  // Когда activeFile меняется — переключаем модель
  useEffect(() => {
    if (editorRef.current && monacoRef.current && resolvedActiveFile) {
      openInEditor(editorRef.current, monacoRef.current, resolvedActiveFile)

      // Monaco wrapper иногда перезаписывает модель в следующий кадр после mount/update.
      // Повторная установка фиксирует стартовый кейс "пусто до переключения вкладки".
      const rafId = window.requestAnimationFrame(() => {
        if (editorRef.current && monacoRef.current) {
          openInEditor(editorRef.current, monacoRef.current, resolvedActiveFile)
          editorRef.current.layout?.()
        }
      })

      return () => window.cancelAnimationFrame(rafId)
    }
  }, [resolvedActiveFile, filesVersion, openInEditor])

  // Если родитель ещё не выбрал активный файл, выбираем первую открытую вкладку
  useEffect(() => {
    if (!activeFile && openFiles.length > 0) {
      onSwitchTab(openFiles[0])
    }
  }, [activeFile, openFiles, onSwitchTab])

  // Очищаем биндинги удалённых файлов
  useEffect(() => {
    const currentPaths = new Set(Array.from(yfiles.keys()))
    modelsRef.current.forEach((model, path) => {
      if (!currentPaths.has(path)) {
        if (activeBindingPathRef.current === path) {
          disposeActiveBinding()
        }
        model.dispose()
        modelsRef.current.delete(path)
      }
    })
  }, [filesVersion, yfiles, disposeActiveBinding])

  const handleMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor
    monacoRef.current = monacoInstance
    if (resolvedActiveFile) openInEditor(editor, monacoInstance, resolvedActiveFile)
  }

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      disposeActiveBinding()
      modelsRef.current.forEach(m => m.dispose())
      modelsRef.current.clear()
    }
  }, [disposeActiveBinding])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e1e' }}>
      {/* Вкладки */}
      <Box sx={{
        borderBottom: '1px solid #2a2a2a', bgcolor: '#141414',
        display: 'flex', alignItems: 'center', minHeight: 36, overflowX: 'auto',
        flexShrink: 0,
      }}>
        {openFiles.map(path => {
          const isActive = path === resolvedActiveFile
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
          path={resolvedActiveFile || 'untitled://empty'}
          language={resolvedActiveFile ? monacoLang(resolvedActiveFile) : 'plaintext'}
          defaultValue={resolvedActiveFile ? (yfiles.get(resolvedActiveFile)?.toString() ?? '') : ''}
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
