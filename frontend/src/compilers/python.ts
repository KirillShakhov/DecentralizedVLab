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
    }
};