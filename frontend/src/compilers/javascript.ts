export const JavascriptCompiler = {
    id: 'javascript',
    name: 'JavaScript (Native V8)',
    monacoLang: 'javascript',
    template: 'console.log("JS работает мгновенно!");\n',

    async isDownloaded(): Promise<boolean> {
        return true; // JS всегда доступен
    },

    async downloadForOffline(onProgress: (progress: number) => void): Promise<void> {
        onProgress(100);
    },

    async init(): Promise<void> {
        // Ничего не делаем, движок браузера готов всегда
    },

    async run(code: string, logOutput: (out: string) => void): Promise<void> {
        let logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));

        try {
            new Function(code)();
            logOutput(logs.join('\n') || 'Программа выполнена');
        } finally {
            console.log = originalLog;
        }
    }
};