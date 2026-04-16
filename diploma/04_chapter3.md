# Глава 3. Реализация

## 3.1 Реализация серверной части

### 3.1.1 Архитектура SignalR Hub

Серверная часть реализована минимально в соответствии с принципом Local-First: сервер является stateless-ретранслятором CRDT-дельт и не хранит содержимое кода или состояние редактора.

Точка входа сервера (`Program.cs`) конфигурирует CORS для разрешения подключений от фронтенда и регистрирует SignalR с протоколом MessagePack:

```csharp
builder.Services.AddSignalR()
    .AddMessagePackProtocol();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "https://vlab.example.com")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

app.MapHub<SyncHub>("/sync-hub");
```

### 3.1.2 Реализация SyncHub

```csharp
public class SyncHub : Hub
{
    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserJoined");
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }

    public async Task SendDocumentUpdate(string roomId, byte[] update)
    {
        await Clients.OthersInGroup(roomId)
            .SendAsync("ReceiveDocumentUpdate", update);
    }
}
```

**Описание методов:**

- `JoinRoom(roomId)` — добавляет соединение в SignalR группу с идентификатором комнаты и рассылает событие `UserJoined` остальным участникам (late-joiner протокол).
- `LeaveRoom(roomId)` — удаляет соединение из группы при явном выходе.
- `SendDocumentUpdate(roomId, update)` — получает бинарную CRDT-дельту (массив байт) и ретранслирует её всем остальным участникам комнаты через `ReceiveDocumentUpdate`.

Важно отметить: сервер не интерпретирует содержимое `update` — это непрозрачный бинарный blob. Декодирование и применение дельты выполняется исключительно на клиентах через `Y.applyUpdate`.

### 3.1.3 Конфигурация Docker и nginx

Развёртывание осуществляется через Docker Compose с двумя сервисами:

```yaml
services:
  backend:
    build: ./DecentralizedVLab
    expose:
      - "8080"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./frontend/dist:/usr/share/nginx/html
```

nginx конфигурируется для проксирования WebSocket-соединений SignalR:

```nginx
location /sync-hub {
    proxy_pass http://backend:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

Заголовки `Upgrade` и `Connection` необходимы для корректного апгрейда HTTP-соединения до WebSocket, используемого SignalR в качестве основного транспорта.

---

## 3.2 Реализация клиентской части

### 3.2.1 WASM-песочница

Каждый поддерживаемый язык реализован как отдельный модуль-компилятор, соответствующий единому интерфейсу:

```typescript
interface Compiler {
  id: string
  name: string
  isDownloaded(): Promise<boolean>
  downloadForOffline(progress: (p: number) => void): Promise<void>
  init(): Promise<void>
  run(files: Record<string, string>, logOutput: (line: string) => void, stdin: string): Promise<void>
}
```

**Реализация PythonCompiler (Pyodide):**

```typescript
export const PythonCompiler: Compiler = {
  id: 'python',
  name: 'Python 3.11 (Pyodide)',

  async run(files, logOutput, stdin) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../workers/python.worker.ts', import.meta.url),
        { type: 'module' }
      )

      const timeout = setTimeout(() => {
        worker.terminate()
        reject(new Error('Превышен лимит времени выполнения (5 сек)'))
      }, 5000)

      worker.onmessage = (e) => {
        if (e.data.type === 'output') logOutput(e.data.text)
        if (e.data.type === 'done') { clearTimeout(timeout); worker.terminate(); resolve() }
        if (e.data.type === 'error') { clearTimeout(timeout); worker.terminate(); reject(new Error(e.data.text)) }
      }

      worker.postMessage({ files, stdin })
    })
  }
}
```

**Реализация Python Web Worker:**

```typescript
// workers/python.worker.ts
import { loadPyodide } from 'pyodide'

let pyodide: any = null

self.onmessage = async ({ data: { files, stdin } }) => {
  if (!pyodide) {
    pyodide = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/' })
  }

  // Монтируем файлы в виртуальную ФС
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    if (parts.length > 1) {
      pyodide.FS.mkdirTree('/' + parts.slice(0, -1).join('/'))
    }
    pyodide.FS.writeFile('/' + path, content)
  }

  // Перехватываем sys.stdout
  pyodide.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stdin = io.StringIO("""${stdin.replace(/`/g, '\\`')}""")
`)

  try {
    // Запускаем главный файл (первый .py файл)
    const mainFile = Object.keys(files).find(f => f.endsWith('.py')) ?? ''
    pyodide.runPython(pyodide.FS.readFile('/' + mainFile, { encoding: 'utf8' }))

    const output = pyodide.runPython('sys.stdout.getvalue()')
    self.postMessage({ type: 'output', text: output })
    self.postMessage({ type: 'done' })
  } catch (err: any) {
    self.postMessage({ type: 'error', text: err.message })
  }
}
```

Watchdog-таймаут (`setTimeout(5000, worker.terminate)`) в UI Thread гарантирует прерывание выполнения в течение 5 секунд даже при бесконечном цикле, поскольку `worker.terminate()` прерывает поток немедленно без возможности перехвата.

### 3.2.2 IndexedDB wrapper

Для работы с IndexedDB реализован типизированный wrapper, скрывающий низкоуровневый IDB API:

```typescript
function openDB(name: string, version: number, upgrade: (db: IDBDatabase) => void) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onupgradeneeded = (e) => upgrade((e.target as IDBOpenDBRequest).result)
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
```

Хранилище курсов (`courseDB`) предоставляет следующий API:

```typescript
export const courseDB = {
  async getAll(): Promise<Course[]> { ... },
  async get(id: string): Promise<Course | undefined> { ... },
  async save(course: Course): Promise<void> { ... },
  async delete(id: string): Promise<void> { ... },
}
```

Хранилище сессий (`sessionDB`) хранит метаданные активных сессий для отображения в TopBar:

```typescript
interface SessionMeta {
  roomId: string
  courseTitle: string
  labTitle: string
  language: string
  lastActive: number
}
```

### 3.2.3 Хук useYjsSession

`useYjsSession` — центральный хук управления CRDT-состоянием лабораторной работы. Инкапсулирует: инициализацию Y.Doc, персистентность через localStorage, SignalR-соединение, файловые операции.

**Инициализация Y.Doc:**

```typescript
export function useYjsSession(
  roomId: string,
  isOnline: boolean,
  initialFiles: Record<string, string>,
  currentUser?: User | null,
) {
  const ydocRef = useRef<Y.Doc | null>(null)

  if (!ydocRef.current) {
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc
    const yfiles = ydoc.getMap<Y.Text>('files')

    // Восстановление из localStorage (предыдущая сессия)
    const saved = localStorage.getItem(`vlab_ydoc_${roomId}`)
    if (saved) {
      try { Y.applyUpdate(ydoc, base64ToUint8(saved)) }
      catch { console.warn('[Yjs] Не удалось восстановить состояние') }
    }

    // Инициализация из шаблона лабораторной (если файлов нет)
    if (yfiles.size === 0 && Object.keys(initialFiles).length > 0) {
      ydoc.transact(() => {
        for (const [path, content] of Object.entries(initialFiles)) {
          const ytext = new Y.Text()
          if (content) ytext.insert(0, content)
          yfiles.set(path, ytext)
        }
      })
    }
  }
```

Инициализация выполняется вне цикла рендеринга (условие `if (!ydocRef.current)`) — это гарантирует создание Y.Doc ровно один раз за жизнь компонента даже в React Strict Mode.

**SignalR-соединение:**

```typescript
useEffect(() => {
  if (!isOnline) return

  const connection = new HubConnectionBuilder()
    .withUrl('/sync-hub')
    .withAutomaticReconnect()
    .withHubProtocol(new MessagePackHubProtocol())
    .configureLogging(LogLevel.Warning)
    .build()

  connection.on('ReceiveDocumentUpdate', (updateAsArray: number[]) => {
    Y.applyUpdate(ydoc, new Uint8Array(updateAsArray), 'signalr')
  })

  connection.on('UserJoined', () => {
    if (connection.state === HubConnectionState.Connected) {
      const fullState = Y.encodeStateAsUpdate(ydoc)
      connection.invoke('SendDocumentUpdate', roomId, Array.from(fullState)).catch(() => {})
    }
  })

  const sendUpdate = (update: Uint8Array, origin: any) => {
    if (origin !== 'signalr' && connection.state === HubConnectionState.Connected) {
      connection.invoke('SendDocumentUpdate', roomId, Array.from(update)).catch(console.error)
    }
  }
  ydoc.on('update', sendUpdate)

  connection.start().then(() => connection.invoke('JoinRoom', roomId))
    .catch(() => console.warn('[SignalR] Локальный режим'))

  return () => {
    ydoc.off('update', sendUpdate)
    connection.invoke('LeaveRoom', roomId).catch(() => {})
    connection.stop()
  }
}, [roomId, isOnline])
```

Проверка `origin !== 'signalr'` предотвращает эхо-отправку: входящие дельты от других участников применяются с меткой `'signalr'` и не отправляются обратно на сервер.

### 3.2.4 Многофайловый редактор MultiFileEditor

`MultiFileEditor` реализует паттерн «один редактор — множество моделей»: единственный экземпляр Monaco Editor переключает отображаемую модель (`ITextModel`) при смене активной вкладки.

**Переключение активного файла:**

```typescript
const openInEditor = useCallback((editor: any, monacoInstance: any, filePath: string) => {
  if (!filePath || !monacoInstance) return
  const ytext = yfiles.get(filePath)
  if (!ytext) return

  const lang = monacoLang(filePath)

  // Создаём или переиспользуем Monaco модель
  if (!modelsRef.current.has(filePath)) {
    const uri = monacoInstance.Uri.parse(`file:///${filePath}`)
    const existing = monacoInstance.editor.getModel(uri)
    const model = existing ?? monacoInstance.editor.createModel(ytext.toString(), lang, uri)
    modelsRef.current.set(filePath, model)
  }

  const model = modelsRef.current.get(filePath)!
  editor.setModel(model) // Мгновенное переключение без перерендеринга

  // Создаём MonacoBinding только если файл изменился
  if (activeBindingPathRef.current !== filePath) {
    disposeActiveBinding()
    activeBindingRef.current = new MonacoBinding(ytext, model, new Set([editor]))
    activeBindingPathRef.current = filePath
  }
}, [yfiles, disposeActiveBinding])
```

**Очистка удалённых файлов:**

```typescript
useEffect(() => {
  const currentPaths = new Set(Array.from(yfiles.keys()))
  modelsRef.current.forEach((model, path) => {
    if (!currentPaths.has(path)) {
      if (activeBindingPathRef.current === path) disposeActiveBinding()
      model.dispose()
      modelsRef.current.delete(path)
    }
  })
}, [filesVersion, yfiles, disposeActiveBinding])
```

При удалении файла из Y.Map соответствующая Monaco-модель и MonacoBinding уничтожаются, что предотвращает утечки памяти.

### 3.2.5 Компонент FileTree

FileTree отображает список файлов лабораторной работы с возможностью создания и удаления файлов:

```typescript
export default function FileTree({
  fileList, activeFile, readOnlyFiles, onSelect, onAdd, onDelete
}: Props) {
  const [newFileName, setNewFileName] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleAdd = () => {
    if (!newFileName.trim()) return
    onAdd(newFileName.trim())
    setNewFileName('')
    setShowInput(false)
  }

  return (
    <Box sx={{ height: '100%', bgcolor: '#0d0d0d', overflowY: 'auto' }}>
      {fileList.map(path => {
        const isReadOnly = readOnlyFiles.includes(path)
        const isActive = path === activeFile
        return (
          <Box key={path} onClick={() => onSelect(path)}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer',
                  bgcolor: isActive ? '#1e1e1e' : 'transparent' }}>
            <Typography variant="body2">{getFileIcon(path)} {path}</Typography>
            {isReadOnly && <LockIcon sx={{ fontSize: 10 }} />}
            {!isReadOnly && (
              <IconButton className="delete-btn" size="small"
                onClick={e => { e.stopPropagation(); onDelete(path) }}>
                <DeleteIcon sx={{ fontSize: 12 }} />
              </IconButton>
            )}
          </Box>
        )
      })}
      {/* Форма добавления нового файла */}
      {showInput && (
        <Box component="form" onSubmit={e => { e.preventDefault(); handleAdd() }}>
          <TextField size="small" value={newFileName}
            onChange={e => setNewFileName(e.target.value)}
            placeholder="имя_файла.py" autoFocus />
        </Box>
      )}
    </Box>
  )
}
```

Read-only файлы помечаются иконкой замка и не имеют кнопки удаления. Это позволяет преподавателю создавать лабораторные работы, где студент может редактировать только определённые файлы (например, `main.py`), тогда как вспомогательные файлы (`utils.py`, `tests.py`) защищены.

### 3.2.6 Хук useTestRunner

`useTestRunner` реализует последовательное выполнение тест-кейсов с нормализацией вывода:

```typescript
export function useTestRunner(
  getFiles: () => Record<string, string>,
  compiler: Compiler | null,
) {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)

  const runTests = useCallback(async (testCases: TestCase[]) => {
    if (!compiler) return
    setRunning(true)
    setResults(testCases.map(tc => ({ id: tc.id, status: 'pending' as const })))

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i]
      setResults(prev => prev.map((r, idx) =>
        idx === i ? { ...r, status: 'running' as const } : r))

      let actual = ''
      try {
        await compiler.run(getFiles(), line => { actual += line + '\n' }, tc.stdin ?? '')
        const status = normalize(actual) === normalize(tc.expectedOutput)
          ? 'pass' : 'fail'
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status, actual, expected: tc.expectedOutput } : r))
      } catch (err: any) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error' as const, actual: err.message } : r))
      }
    }
    setRunning(false)
  }, [getFiles, compiler])

  return { results, running, runTests, summary: calcSummary(results) }
}

function normalize(s: string): string {
  return s.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}
```

Нормализация (`trim` + замена CRLF на LF) устраняет платформозависимые различия в переносах строк, что особенно важно при тестировании кода, написанного студентами на разных ОС.

### 3.2.7 Хук useProfiler и компонент ProfilerPanel

`useProfiler` измеряет производительность WASM-исполнения через N итераций:

```typescript
export function useProfiler(
  getFiles: () => Record<string, string>,
  compiler: Compiler | null,
  langId: string,
) {
  const [result, setResult] = useState<ProfilerResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const runBenchmark = useCallback(async (iterations = 100) => {
    if (!compiler) return
    setRunning(true)
    const times: number[] = []
    const files = getFiles()

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now()
      await compiler.run(files, () => {}, '')
      times.push(performance.now() - t0)
      setProgress(Math.round(((i + 1) / iterations) * 100))
    }

    // Измеряем RTT к серверу
    const rttStart = performance.now()
    await fetch('/', { method: 'HEAD' }).catch(() => {})
    const rtt = performance.now() - rttStart

    setResult({ times, stats: calcStats(times), rtt })
    setRunning(false)
  }, [getFiles, compiler])

  return { result, running, progress, runBenchmark }
}

function calcStats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b)
  const n = sorted.length
  return {
    min: sorted[0],
    max: sorted[n - 1],
    avg: times.reduce((a, b) => a + b, 0) / n,
    median: sorted[Math.floor(n / 2)],
    p95: sorted[Math.floor(n * 0.95)],
  }
}
```

`ProfilerPanel` отображает результаты в виде интерактивной гистограммы (20 бинов) и сравнительной таблицы WASM vs сервер:

```typescript
// Построение 20-bin гистограммы
const buildHistogram = (times: number[], bins = 20) => {
  const min = Math.min(...times)
  const max = Math.max(...times)
  const binSize = (max - min) / bins
  const counts = new Array(bins).fill(0)
  times.forEach(t => {
    const idx = Math.min(Math.floor((t - min) / binSize), bins - 1)
    counts[idx]++
  })
  return counts.map((count, i) => ({
    label: `${(min + i * binSize).toFixed(1)}`,
    count,
  }))
}
```

Экспорт отчёта в формате Markdown генерирует файл с таблицей результатов и метаданными (язык, дата, количество итераций), который пользователь может сохранить через механизм загрузки файла браузера.

### 3.2.8 Service Worker и PWA

Service Worker реализует стратегию Cache First для статических ресурсов:

```javascript
// sw.js
const CACHE_NAME = 'vlab-v1'
const STATIC_ASSETS = ['/', '/index.html', '/assets/...']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(response => {
        // Кэшируем WASM-бинарники при первой загрузке
        if (event.request.url.includes('pyodide') ||
            event.request.url.includes('fengari') ||
            event.request.url.includes('sql-wasm')) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
```

`manifest.json` конфигурирует приложение как PWA:

```json
{
  "name": "Виртуальная лаборатория",
  "short_name": "VLab",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#2196f3",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Соответствие критериям PWA (HTTPS, manifest, Service Worker) позволяет браузеру предложить пользователю установить приложение на устройство, что обеспечивает нативный UX запуска без открытия браузера.
