import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { perfMetricsStore } from "../perf-metrics-store";
import { isMonitoring, startMonitoring, stopMonitoring } from "../memory-monitor";

interface PerformanceMemoryLike {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function setPerformanceMemory(memory: PerformanceMemoryLike | undefined): void {
  Object.defineProperty(performance, "memory", {
    configurable: true,
    writable: true,
    value: memory,
  });
}

describe("memory-monitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    perfMetricsStore.clear();
    stopMonitoring();
    setPerformanceMemory(undefined);
  });

  afterEach(() => {
    stopMonitoring();
    vi.useRealTimers();
    setPerformanceMemory(undefined);
  });

  it("VITE_PERF_LOG=true かつ performance.memory がある場合に heap-used-bytes を記録する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    setPerformanceMemory({
      usedJSHeapSize: 1234,
      totalJSHeapSize: 5678,
      jsHeapSizeLimit: 9999,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    startMonitoring();
    vi.advanceTimersByTime(1000);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "heap-used-bytes",
        durationMs: 1234,
      }),
    );
    expect(isMonitoring()).toBe(true);
  });

  it("VITE_PERF_LOG=false のとき起動しない", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    setPerformanceMemory({
      usedJSHeapSize: 1234,
      totalJSHeapSize: 5678,
      jsHeapSizeLimit: 9999,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    startMonitoring();
    vi.advanceTimersByTime(2000);

    expect(pushSpy).not.toHaveBeenCalled();
    expect(isMonitoring()).toBe(false);
  });

  it("performance.memory がない環境では no-op", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    setPerformanceMemory(undefined);
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    startMonitoring();
    vi.advanceTimersByTime(2000);

    expect(pushSpy).not.toHaveBeenCalled();
    expect(isMonitoring()).toBe(false);
  });

  it("startMonitoring を複数回呼んでも interval は1本だけ", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    setPerformanceMemory({
      usedJSHeapSize: 200,
      totalJSHeapSize: 5678,
      jsHeapSizeLimit: 9999,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    startMonitoring();
    startMonitoring();
    vi.advanceTimersByTime(1000);

    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it("stopMonitoring 後は記録を停止する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    setPerformanceMemory({
      usedJSHeapSize: 300,
      totalJSHeapSize: 5678,
      jsHeapSizeLimit: 9999,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    startMonitoring();
    vi.advanceTimersByTime(1000);
    stopMonitoring();
    vi.advanceTimersByTime(3000);

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(isMonitoring()).toBe(false);
  });
});
