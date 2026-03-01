// frontend/src/compilers/index.ts
import { PythonCompiler } from './python';
import { JavascriptCompiler } from './javascript';
import { JavaCompiler } from './java';
import { SQLiteCompiler } from './sqlite';
import { LuaCompiler } from './lua';

export const COMPILERS: Record<string, any> = {
    [PythonCompiler.id]: PythonCompiler,
    [JavaCompiler.id]: JavaCompiler,
    [JavascriptCompiler.id]: JavascriptCompiler,
    [SQLiteCompiler.id]: SQLiteCompiler,
    [LuaCompiler.id]: LuaCompiler
};

// Хелпер для получения имен кэшей (важно для страницы настроек)
export const COMPILER_CACHES = {
    python: 'wasm-compiler-python',
    java: 'wasm-compiler-java',
    lua: 'wasm-compiler-lua',
    sqlite: 'wasm-compiler-sqlite'
};