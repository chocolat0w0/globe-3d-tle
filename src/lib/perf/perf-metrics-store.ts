import type { PerfEntry } from "./perf-logger";

export interface PerfStats {
  latest: number;
  avg: number;
  p95: number;
  count: number;
}

interface RingBuffer {
  buffer: number[];
  cursor: number;
  count: number;
}

export class PerfMetricsStore {
  private readonly maxEntriesPerLabel: number;
  private readonly data = new Map<string, RingBuffer>();
  private readonly subscribers = new Set<() => void>();

  constructor(maxEntriesPerLabel = 100) {
    this.maxEntriesPerLabel = maxEntriesPerLabel;
  }

  push(entry: PerfEntry): void {
    let rb = this.data.get(entry.label);
    if (!rb) {
      rb = { buffer: new Array(this.maxEntriesPerLabel), cursor: 0, count: 0 };
      this.data.set(entry.label, rb);
    }
    rb.buffer[rb.cursor] = entry.durationMs;
    rb.cursor = (rb.cursor + 1) % this.maxEntriesPerLabel;
    rb.count = Math.min(rb.count + 1, this.maxEntriesPerLabel);
    for (const cb of this.subscribers) cb();
  }

  getStats(label: string): PerfStats | null {
    const rb = this.data.get(label);
    if (!rb || rb.count === 0) return null;

    const { buffer, cursor, count } = rb;

    const values =
      count < this.maxEntriesPerLabel ? buffer.slice(0, count) : buffer.slice();

    const latestIdx =
      (cursor - 1 + this.maxEntriesPerLabel) % this.maxEntriesPerLabel;
    const latest = buffer[latestIdx];

    const avg = values.reduce((sum, v) => sum + v, 0) / count;

    const sorted = values.slice().sort((a, b) => a - b);
    const p95Idx = Math.ceil(count * 0.95) - 1;
    const p95 = sorted[p95Idx];

    return { latest, avg, p95, count };
  }

  getAllLabels(): string[] {
    return Array.from(this.data.keys());
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  clear(): void {
    this.data.clear();
    for (const cb of this.subscribers) cb();
  }
}

export const perfMetricsStore = new PerfMetricsStore();
