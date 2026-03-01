const ASSETS = [
    '/compilers/pyodide/pyodide.mjs',
    '/compilers/pyodide/pyodide.asm.wasm',
    '/compilers/pyodide/pyodide.asm.js',
    '/compilers/pyodide/python_stdlib.zip',
    '/compilers/pyodide/repodata.json'
];

const CACHE_NAME = 'wasm-compiler-python';
let pyodideInstance: any = null;

export const PythonCompiler = {
    id: 'python',
    name: 'Python (Pyodide WASM)',
    monacoLang: 'python',
    template: 'def greet(name):\n    print(f"Привет, {name}! Локальный Python работает.")\n\ngreet("В-Лаба")\n',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME);
        const req = await cache.match(ASSETS[0]);
        return !!req;
    },

    async downloadForOffline(onProgress: (progress: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME);
        for (let i = 0; i < ASSETS.length; i++) {
            await cache.add(ASSETS[i]);
            onProgress(Math.round(((i + 1) / ASSETS.length) * 100));
        }
    },

    async init(): Promise<void> {
        if (pyodideInstance) return;

        try {
            const moduleUrl = '/compilers/pyodide/pyodide.mjs';
            const dynamicImport = new Function('url', 'return import(url)');
            const pyodideModule = await dynamicImport(moduleUrl);

            pyodideInstance = await pyodideModule.loadPyodide({
                indexURL: '/compilers/pyodide/'
            });
        } catch (err: any) {
            // Перехватываем ошибку отсутствия сети/файла
            if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
                throw new Error("Компилятор не скачан для работы без сети. Подключитесь к серверу и нажмите 'Скачать для офлайн'.");
            }
            throw new Error(`Не удалось инициализировать Pyodide: ${err.message}`);
        }
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        if (!pyodideInstance) throw new Error("Движок не инициализирован");

        await pyodideInstance.runPythonAsync(`import sys, io\nsys.stdout = io.StringIO()`);
        await pyodideInstance.runPythonAsync(code);
        const stdout = await pyodideInstance.runPythonAsync("sys.stdout.getvalue()");
        logOutput(stdout || 'Программа выполнена (нет вывода)');
    },

    // Проверяем, есть ли на сервере файл новее, чем у нас в кэше
    async checkForUpdates(): Promise<boolean> {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedReq = await cache.match(ASSETS[0]); // Проверяем по главному файлу
            if (!cachedReq) return false;

            // Делаем легкий HEAD запрос в обход браузерного кэша
            const netReq = await fetch(ASSETS[0], { method: 'HEAD', cache: 'no-cache' });

            const cachedDate = cachedReq.headers.get('last-modified');
            const netDate = netReq.headers.get('last-modified');

            // Если даты отличаются, значит на сервере новая версия
            if (cachedDate && netDate && cachedDate !== netDate) return true;

            // Резервная проверка по размеру файла
            const cachedSize = cachedReq.headers.get('content-length');
            const netSize = netReq.headers.get('content-length');
            if (cachedSize && netSize && cachedSize !== netSize) return true;

            return false;
        } catch (e) {
            return false; // Если нет интернета, обновы проверить нельзя
        }
    },

    // Удаляем компилятор из памяти устройства
    async removeOffline(): Promise<void> {
        await caches.delete(CACHE_NAME);
    },
};