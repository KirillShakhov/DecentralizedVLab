
const ASSETS = [
    '/compilers/java/java.mjs',
    '/compilers/java/jvm.wasm'
];

const CACHE_NAME = 'wasm-compiler-java';
let javaInstance: any = null;

export const JavaCompiler = {
    id: 'java',
    name: 'Java (WASM JVM)',
    monacoLang: 'java',
    template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Привет, В-Лаба! Java работает в браузере.");\n    }\n}\n',

    async isDownloaded(): Promise<boolean> {
        const cache = await caches.open(CACHE_NAME);
        const req = await cache.match(ASSETS[0]);
        return !!req;
    },

    async downloadForOffline(onProgress: (progress: number) => void): Promise<void> {
        const cache = await caches.open(CACHE_NAME);
        for (let i = 0; i < ASSETS.length; i++) {
            await cache.add(ASSETS[i]);
            // Эмулируем долгую загрузку, чтобы пользователь успел увидеть лоадер
            await new Promise(r => setTimeout(r, 300));
            onProgress(Math.round(((i + 1) / ASSETS.length) * 100));
        }
    },

    async checkForUpdates(): Promise<boolean> {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedReq = await cache.match(ASSETS[0]);
            if (!cachedReq) return false;

            const netReq = await fetch(ASSETS[0], { method: 'HEAD', cache: 'no-cache' });

            const cachedDate = cachedReq.headers.get('last-modified');
            const netDate = netReq.headers.get('last-modified');

            if (cachedDate && netDate && cachedDate !== netDate) return true;
            return false;
        } catch (e) {
            return false;
        }
    },

    async removeOffline(): Promise<void> {
        await caches.delete(CACHE_NAME);
    },

    async init(): Promise<void> {
        if (javaInstance) return;

        try {
            const moduleUrl = '/compilers/java/java.mjs';
            const dynamicImport = new Function('url', 'return import(url)');

            const javaModule = await dynamicImport(moduleUrl);
            javaInstance = await javaModule.loadJVM({
                indexURL: '/compilers/java/'
            });
        } catch (err: any) {
            throw new Error(`Ошибка JVM: ${err.message}`);
        }
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        if (!javaInstance) throw new Error("Движок не инициализирован");

        // Передаем код в нашу "виртуальную машину"
        const stdout = await javaInstance.runJava(code);
        logOutput(stdout);
    }
};