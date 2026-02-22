import { perfMetricsStore } from "./perf-metrics-store";

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

type PerformanceWithMemory = Performance & {
  memory?: PerformanceMemory;
};

let timerId: ReturnType<typeof setInterval> | null = null;

function getMemory(): PerformanceMemory | null {
  const perf = performance as PerformanceWithMemory;
  return perf.memory ?? null;
}

export function startMonitoring(intervalMs = 1000): void {
  if (timerId !== null) return;
  if (import.meta.env.VITE_PERF_LOG !== "true") return;
  if (!getMemory()) return;

  timerId = setInterval(() => {
    const memory = getMemory();
    if (!memory) return;

    perfMetricsStore.push({
      label: "heap-used-bytes",
      durationMs: memory.usedJSHeapSize,
      timestamp: performance.now(),
    });
  }, intervalMs);
}

export function stopMonitoring(): void {
  if (timerId === null) return;
  clearInterval(timerId);
  timerId = null;
}

export function isMonitoring(): boolean {
  return timerId !== null;
}
