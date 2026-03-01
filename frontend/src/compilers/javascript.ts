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

    async run(code, logOutput) {
        let logs = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));
        try {
            const fn = new Function(code);
            fn();
            logOutput(logs.join('\n') || 'Программа выполнена (логов нет)');
        } catch (err) {
            logOutput(`❌ Ошибка выполнения:\n${err.message}`);
        } finally {
            console.log = originalLog;
        }
    },

    async checkForUpdates() { return false; },

    async removeOffline() {
        await caches.delete(this.CACHE_NAME);
    }
};