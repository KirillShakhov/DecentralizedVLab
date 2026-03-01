
const ASSETS = [
    '/compilers/lua/wasmoon.js',
    '/compilers/lua/wasmoon.wasm'
];

const CACHE_NAME = 'wasm-compiler-lua';
let luaEngine: any = null;

export const LuaCompiler = {
    id: 'lua',
    name: 'Lua 5.4 (WASM)',
    monacoLang: 'lua',
    template: '-- Лабораторная работа по Lua\n' +
        'print("Движок Wasmoon 1.16.0 запущен!")\n' +
        'print("Версия рантайма: " .. _VERSION)\n\n' +
        'local data = { 10, 20, 30, 40, 50 }\n' +
        'local sum = 0\n' +
        'for _, v in ipairs(data) do sum = sum + v end\n' +
        'print("Сумма элементов таблицы: " .. sum)',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME);
        const req = await cache.match(ASSETS[0]);
        return !!req;
    },

    async downloadForOffline(onProgress: (p: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME);
        for (let i = 0; i < ASSETS.length; i++) {
            const res = await fetch(new Request(ASSETS[i], { cache: 'no-store' }));
            await cache.put(ASSETS[i], res);
            onProgress(Math.round(((i + 1) / ASSETS.length) * 100));
        }
    },

    async init(): Promise<void> {
        if (luaEngine) return;

        try {
            if (!(window as any).wasmoon) {
                // 1. Загружаем JS как текст
                const response = await fetch(ASSETS[0]);
                const scriptText = await response.text();

                // 2. МАСКИРОВКА: Создаем обертку, которая скрывает define и exports.
                // Это заставит UMD-бандл выполнить ветку (global.wasmoon = {})
                const script = document.createElement('script');
                script.text = `(function() { 
                    var define = undefined; 
                    var exports = undefined; 
                    var module = undefined; 
                    ${scriptText} 
                })();`;
                document.head.appendChild(script);
            }

            // 3. Теперь объект гарантированно в window.wasmoon
            const wasmoon = (window as any).wasmoon;
            if (!wasmoon || !wasmoon.LuaFactory) {
                throw new Error("Не удалось инициализировать LuaFactory через глобальный контекст.");
            }

            // 4. Создаем фабрику, передавая путь к WASM
            const factory = new wasmoon.LuaFactory(ASSETS[1]);

            // 5. Создаем движок
            luaEngine = await factory.createEngine();
            console.log("[Lua] Виртуальная машина 1.16.0 успешно запущена.");
        } catch (err: any) {
            console.error("[Lua Init Error]", err);
            throw new Error(`Ошибка Lua: ${err.message}`);
        }
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        if (!luaEngine) throw new Error("Lua не инициализирована");
        let output = "";

        // Перехват принта согласно API 1.16.0
        luaEngine.global.set('print', (...args: any[]) => {
            output += args.map(a => String(a)).join('\t') + "\n";
        });

        try {
            await luaEngine.doString(code);
            logOutput(output || "Программа выполнена успешно.");
        } catch (err: any) {
            logOutput(`❌ Ошибка исполнения Lua:\n${err.message}`);
        }
    },

    async checkForUpdates() { return false; },
    async removeOffline() {
        if (luaEngine) luaEngine.global.close();
        await caches.delete(CACHE_NAME);
        luaEngine = null;
    }
};