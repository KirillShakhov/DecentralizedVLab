
const ASSETS = [
    '/compilers/ruby/ruby-wrapper.js', // browser.umd.js
    '/compilers/ruby/ruby.wasm'
];

const CACHE_NAME = 'wasm-compiler-ruby-2.8';
let rubyVM: any = null;
let outputBuffer = "";

export const RubyCompiler = {
    id: 'ruby',
    name: 'Ruby (WASM API)',
    monacoLang: 'ruby',
    template: '# Лабораторная работа по Ruby\n' +
        'puts "Ruby успешно запущен в децентрализованной среде!"\n' +
        'puts "Версия: #{RUBY_VERSION}"\n' +
        'def calc(a, b); a * b; end\n' +
        'puts "Результат 12 * 12 = #{calc(12, 12)}"',

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
        if (rubyVM) return;

        // 1. Загружаем скрипт как классический JS (через тег)
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = ASSETS[0];
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        try {
            // 2. ВАЖНО: Обращаемся по имени из твоего файла: "ruby-wasm-wasi"
            const lib = (window as any)["ruby-wasm-wasi"];

            if (!lib || !lib.DefaultRubyVM) {
                console.error("Window state:", window);
                throw new Error("API не найдено. Проверь, что в ruby-wrapper.js лежит browser.umd.js");
            }

            // 3. Fetch WASM
            const response = await fetch(ASSETS[1]);
            const buffer = await response.arrayBuffer();
            const module = await WebAssembly.compile(buffer);

            // 4. Инициализация VM
            const { vm } = await lib.DefaultRubyVM(module);
            rubyVM = vm;

            console.log("[Ruby] Виртуальная машина готова!");
        } catch (err: any) {
            console.error("[Ruby Init Error]", err);
            throw new Error(`Ошибка Ruby: ${err.message}`);
        }
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        if (!rubyVM) throw new Error("Ruby не инициализирован");

        outputBuffer = "";

        // ХАК: Так как DefaultRubyVM в этой версии привязан к console.log, 
        // мы временно перехватываем его, чтобы отправить текст в твой UI
        const originalLog = console.log;
        console.log = (message: any) => {
            outputBuffer += message + "\n";
            // originalLog(message); // Раскомментируй, если хочешь видеть дубль в консоли F12
        };

        try {
            rubyVM.eval(code);
            logOutput(outputBuffer || "Выполнено успешно.");
        } catch (err: any) {
            logOutput(`❌ Ошибка исполнения:\n${err.message}\n${outputBuffer}`);
        } finally {
            // ОБЯЗАТЕЛЬНО возвращаем console.log на место
            console.log = originalLog;
        }
    },

    async checkForUpdates() { return false; },
    async removeOffline() { await caches.delete(CACHE_NAME); rubyVM = null; }
};