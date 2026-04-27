export const JavascriptCompiler = {
    id: 'javascript',
    name: 'JavaScript (Native V8)',
    monacoLang: 'javascript',
    template: 'console.log("JS работает мгновенно!");\n',
    CACHE_NAME: 'wasm-compiler-javascript',

    async isDownloaded() {
        return await caches.has(this.CACHE_NAME);
    },

    async downloadForOffline(onProgress) {
        if (onProgress) onProgress(50);
        const cache = await caches.open(this.CACHE_NAME);
        await cache.put('/v8-stub.txt', new Response('JS_READY'));
        if (onProgress) onProgress(100);
    },

    async init() {
        const downloaded = await this.isDownloaded();
        if (!downloaded) {
            console.log("[JS-Stub] Авто-кэширование нативного движка...");
            await this.downloadForOffline();
        }
        // V8 уже вшит в браузер, больше ничего делать не нужно
    },

    async run(files, logOutput, stdin) {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => logs.push(args.map(String).join(' '));
        console.error = (...args) => logs.push('❌ ' + args.map(String).join(' '));
        console.warn = (...args) => logs.push('⚠️ ' + args.map(String).join(' '));

        try {
            // Точка входа: main.js или первый файл
            const entry = 'main.js' in files ? 'main.js' : Object.keys(files)[0];

            // Собираем вспомогательные модули как переменные
            // Простой механизм: остальные файлы выполняются первыми и экспортируют в globalThis
            const helpers = Object.entries(files)
                .filter(([path]) => path !== entry)
                .map(([, code]) => code)
                .join('\n\n');

            const fullCode = helpers + '\n\n' + files[entry];
            const fn = new Function(fullCode);
            fn();
            logOutput(logs.join('\n') || 'Программа выполнена (логов нет)');
        } catch (err) {
            logOutput(`❌ Ошибка выполнения:\n${err.message}`);
        } finally {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        }
    },

    async checkForUpdates() { return false; },

    async removeOffline() {
        await caches.delete(this.CACHE_NAME);
    }
};