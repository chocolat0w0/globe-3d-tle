export interface PerfEntry {
  label: string;
  durationMs: number;
  timestamp: number; // performance.now() 時刻
}

export type PerfEntryCallback = (entry: PerfEntry) => void;

export class PerfLogger {
  private readonly enabled: boolean;
  private readonly onEntry?: PerfEntryCallback;
  private readonly starts = new Map<string, number>();

  constructor(options?: { enabled?: boolean; onEntry?: PerfEntryCallback }) {
    this.enabled =
      options?.enabled ?? import.meta.env.VITE_PERF_LOG === "true";
    this.onEntry = options?.onEntry;
  }

  start(label: string): void {
    if (!this.enabled) return;
    this.starts.set(label, performance.now());
  }

  end(label: string): PerfEntry | null {
    if (!this.enabled) return null;
    const startTime = this.starts.get(label);
    if (startTime === undefined) return null;
    this.starts.delete(label);
    const entry: PerfEntry = {
      label,
      durationMs: performance.now() - startTime,
      timestamp: startTime,
    };
    this.onEntry?.(entry);
    return entry;
  }

  measure<T>(label: string, fn: () => T): T {
    if (!this.enabled) return fn();
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
}

// モジュールレベルのデフォルトインスタンス
export const perfLogger = new PerfLogger();
