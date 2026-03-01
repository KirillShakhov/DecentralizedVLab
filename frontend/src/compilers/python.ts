// Обрати внимание: теперь мы используем .mjs вместо .js
const ASSETS = [
    '/pyodide/pyodide.mjs',
    '/pyodide/pyodide.asm.wasm',
    '/pyodide/pyodide.asm.js',
    '/pyodide/python_stdlib.zip',
    '/pyodide/repodata.json'
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
            // Прячем путь в переменную, чтобы Rollup не пытался разрезолвить его при сборке
            const moduleUrl = '/pyodide/pyodide.mjs';

            // Динамический импорт сработает уже в браузере клиента
            const pyodideModule = await import(/* @vite-ignore */ moduleUrl);

            pyodideInstance = await pyodideModule.loadPyodide({
                indexURL: '/pyodide/'
            });
        } catch (err: any) {
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