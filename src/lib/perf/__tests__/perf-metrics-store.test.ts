import { describe, it, expect, vi, beforeEach } from "vitest";
import { PerfMetricsStore } from "../perf-metrics-store";
import type { PerfEntry } from "../perf-logger";

function makeEntry(label: string, durationMs: number): PerfEntry {
  return { label, durationMs, timestamp: 0 };
}

describe("PerfMetricsStore", () => {
  let store: PerfMetricsStore;

  beforeEach(() => {
    store = new PerfMetricsStore();
  });

  it("push したエントリの getStats で latest/avg/p95/count が正しく返る", () => {
    store.push(makeEntry("render", 10));
    store.push(makeEntry("render", 20));
    store.push(makeEntry("render", 30));

    const stats = store.getStats("render");
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(3);
    expect(stats!.latest).toBe(30);
    expect(stats!.avg).toBeCloseTo(20);
    // sorted: [10, 20, 30], p95Idx = Math.ceil(3 * 0.95) - 1 = 2
    expect(stats!.p95).toBe(30);
  });

  it("存在しないラベルで getStats を呼ぶと null を返す", () => {
    const stats = store.getStats("unknown-label");
    expect(stats).toBeNull();
  });

  it("リングバッファの上限超過時に最古エントリが破棄され、統計が更新される", () => {
    const maxEntries = 3;
    const store3 = new PerfMetricsStore(maxEntries);

    store3.push(makeEntry("orbit", 10));
    store3.push(makeEntry("orbit", 20));
    store3.push(makeEntry("orbit", 30));
    // 上限に達した状態で最古 (10) が破棄される
    store3.push(makeEntry("orbit", 40));

    const stats = store3.getStats("orbit");
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(3); // 上限を超えない
    expect(stats!.latest).toBe(40);
    // 残存エントリは [20, 30, 40]
    expect(stats!.avg).toBeCloseTo((20 + 30 + 40) / 3);
    // sorted: [20, 30, 40], p95Idx = Math.ceil(3 * 0.95) - 1 = 2
    expect(stats!.p95).toBe(40);
  });

  it("p95 計算が正しい（20件のデータで検証）", () => {
    // 1 から 20 の値を push
    for (let i = 1; i <= 20; i++) {
      store.push(makeEntry("compute", i));
    }

    const stats = store.getStats("compute");
    expect(stats).not.toBeNull();
    expect(stats!.count).toBe(20);
    // sorted: [1..20], p95Idx = Math.ceil(20 * 0.95) - 1 = 18 → sorted[18] = 19
    expect(stats!.p95).toBe(19);
  });

  it("getAllLabels が push 済みの全ラベルを返す", () => {
    store.push(makeEntry("alpha", 1));
    store.push(makeEntry("beta", 2));
    store.push(makeEntry("alpha", 3));
    store.push(makeEntry("gamma", 4));

    const labels = store.getAllLabels();
    expect(labels).toHaveLength(3);
    expect(labels).toContain("alpha");
    expect(labels).toContain("beta");
    expect(labels).toContain("gamma");
  });

  it("subscribe で登録したコールバックが push 時に呼ばれる", () => {
    const cb = vi.fn();
    store.subscribe(cb);

    store.push(makeEntry("fps", 16));
    expect(cb).toHaveBeenCalledTimes(1);

    store.push(makeEntry("fps", 17));
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("subscribe の戻り値（unsubscribe）呼び出し後はコールバックが呼ばれない", () => {
    const cb = vi.fn();
    const unsubscribe = store.subscribe(cb);

    store.push(makeEntry("fps", 16));
    expect(cb).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.push(makeEntry("fps", 17));
    expect(cb).toHaveBeenCalledTimes(1); // 増えない
  });

  it("clear 後に getStats が null を返し、getAllLabels が空になる", () => {
    store.push(makeEntry("render", 10));
    store.push(makeEntry("worker", 50));

    store.clear();

    expect(store.getStats("render")).toBeNull();
    expect(store.getStats("worker")).toBeNull();
    expect(store.getAllLabels()).toHaveLength(0);
  });
});
