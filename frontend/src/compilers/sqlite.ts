// 1. Обновляем пути к ассетам и имя кэша
const ASSETS = [
    '/compilers/sqlite/sql-wasm.js',
    '/compilers/sqlite/sql-wasm.wasm'
];

const CACHE_NAME = 'wasm-compiler-sqlite'; // Сделали имя кэша специфичным
let dbInstance: any = null;
let SQL: any = null;

export const SQLiteCompiler = {
    id: 'sqlite', // ID остается прежним или меняем на sqlite_wasm
    name: 'SQLite 3 (WASM)', // Более конкретное имя для UI
    monacoLang: 'sql',
    template: '-- Лабораторная работа по SQLite\n' +
        'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT);\n' +
        'INSERT INTO users (username, email) VALUES ("admin", "admin@v-lab.local");\n' +
        'SELECT * FROM users;',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME);
        const req = await cache.match(ASSETS[0]);
        return !!req;
    },

    async downloadForOffline(onProgress: (p: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME);
        for (let i = 0; i < ASSETS.length; i++) {
            try {
                // Принудительно качаем свежую версию без кэша браузера
                const res = await fetch(new Request(ASSETS[i], { cache: 'no-store' }));
                await cache.put(ASSETS[i], res);
                onProgress(Math.round(((i + 1) / ASSETS.length) * 100));
            } catch (e) {
                console.error("Ошибка при скачивании ассета SQLite:", ASSETS[i]);
            }
        }
    },

    async checkForUpdates(): Promise<boolean> {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedReq = await cache.match(ASSETS[0]);
            if (!cachedReq) return false;

            const netReq = await fetch(ASSETS[0], { method: 'HEAD', cache: 'no-cache' });
            return cachedReq.headers.get('last-modified') !== netReq.headers.get('last-modified');
        } catch (e) { return false; }
    },

    async removeOffline(): Promise<void> {
        await caches.delete(CACHE_NAME);
        dbInstance = null;
    },

    async init(): Promise<void> {
        if (dbInstance) return;

        // Загружаем скрипт
        await new Promise((resolve, reject) => {
            if (window.initSqlJs) return resolve(true);
            const script = document.createElement('script');
            script.src = ASSETS[0];
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        // @ts-ignore
        SQL = await window.initSqlJs({
            // Указываем НОВЫЙ путь к .wasm файлу
            locateFile: (file: string) => `/compilers/sqlite/${file}`
        });

        dbInstance = new SQL.Database();
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        if (!dbInstance) throw new Error("SQLite не инициализирован");

        try {
            const res = dbInstance.exec(code);
            if (res.length === 0) {
                logOutput("✅ Запрос выполнен (изменено строк: " + dbInstance.getRowsModified() + ")");
                return;
            }

            res.forEach((result: any) => {
                const header = result.columns.join(' | ');
                const rows = result.values.map((v: any) => v.join(' | ')).join('\n');
                logOutput(`\n[РЕЗУЛЬТАТ ЗАПРОСА]:\n${header}\n${'-'.repeat(header.length)}\n${rows}\n`);
            });
        } catch (err: any) {
            logOutput(`❌ Ошибка SQLite: ${err.message}`);
        }
    }
};