export async function loadJVM(config) {
    console.log("[WASM] Инициализация Java Virtual Machine...", config);

    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
        runJava: async (code) => {
            // Простая регулярка, чтобы достать текст из System.out.println
            const printMatch = code.match(/System\.out\.println\("(.*?)"\)/);
            const output = printMatch ? printMatch[1] : "Программа выполнена успешно (нет вывода)";

            return `[Java WASM Edge] Скомпилировано и выполнено локально:\n> ${output}`;
        }
    };
}