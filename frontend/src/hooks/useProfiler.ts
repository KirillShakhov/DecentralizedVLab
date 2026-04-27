import { useState, useCallback } from 'react'

export interface BenchmarkStats {
  min: number
  max: number
  avg: number
  median: number
  p95: number
}

export interface BenchmarkResult {
  iterations: number
  times: number[]         // мс на каждый прогон
  stats: BenchmarkStats
  networkRtt: number | null  // RTT до сервера, мс
  language: string
  timestamp: number
}

function calcStats(times: number[]): BenchmarkStats {
  const sorted = [...times].sort((a, b) => a - b)
  const sum = times.reduce((a, b) => a + b, 0)
  return {
    min:    Math.round(sorted[0]),
    max:    Math.round(sorted[sorted.length - 1]),
    avg:    Math.round(sum / times.length),
    median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    p95:    Math.round(sorted[Math.floor(sorted.length * 0.95)]),
  }
}

async function measureNetworkRtt(): Promise<number | null> {
  try {
    const start = performance.now()
    await fetch('/', { method: 'HEAD', cache: 'no-store' })
    return Math.round(performance.now() - start)
  } catch {
    return null
  }
}

export function useProfiler(
  getFiles: () => Record<string, string>,
  compiler: any,
  language: string,
) {
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const runBenchmark = useCallback(async (iterations: number) => {
    if (!compiler || running) return

    setRunning(true)
    setProgress(0)
    setResult(null)

    const files = getFiles()   // снимок состояния файлов
    const times: number[] = []

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now()
      try {
        // Запускаем с пустым stdin, результат выбрасываем
        await compiler.run(files, () => {}, '')
      } catch { /* подавляем ошибки при бенчмарке */ }
      times.push(performance.now() - t0)
      setProgress(Math.round(((i + 1) / iterations) * 100))

      // Дышим между итерациями чтобы не блокировать UI
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 0))
    }

    const [stats, networkRtt] = await Promise.all([
      Promise.resolve(calcStats(times)),
      measureNetworkRtt(),
    ])

    setResult({ iterations, times, stats, networkRtt, language, timestamp: Date.now() })
    setRunning(false)
    setProgress(0)
  }, [getFiles, compiler, language, running])

  const clearResult = useCallback(() => setResult(null), [])

  return { result, running, progress, runBenchmark, clearResult }
}
