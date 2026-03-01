export const JavascriptCompiler = {
    id: 'javascript',
    name: 'JavaScript (Native V8)',
    monacoLang: 'javascript',
    template: 'console.log("JS работает мгновенно!");\n',

    async isDownloaded(): Promise<boolean> { return true; },
    async downloadForOffline(onProgress: (p: number) => void): Promise<void> { onProgress(100); },
    async init(): Promise<void> { },
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
    },
    // Добавляем новые методы для консистентности интерфейса:
    async checkForUpdates(): Promise<boolean> { return false; },
    async removeOffline(): Promise<void> { }
};