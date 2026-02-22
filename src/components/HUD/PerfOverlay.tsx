import { useEffect, useState } from "react";
import { perfMetricsStore } from "../../lib/perf/perf-metrics-store";
import { startMonitoring, stopMonitoring } from "../../lib/perf/memory-monitor";
import { orbitCache } from "../../hooks/useOrbitData";

interface PerfSnapshot {
  fpsLatest: number | null;
  fpsp95: number | null;
  workerRttAvg: number | null;
  workerRttp95: number | null;
  fpUpdateAvg: number | null;
  cacheSize: number;
  cacheCapacity: number;
  cacheBytes: number;
  heapUsedBytes: number | null;
}

function collectSnapshot(): PerfSnapshot {
  const labels = perfMetricsStore.getAllLabels();

  // FPS
  const fpsStats = perfMetricsStore.getStats("fps");

  // worker-rtt:* の集約（avg は各ラベルの avg の平均、p95 は最大値）
  const rttLabels = labels.filter((l) => l.startsWith("worker-rtt:"));
  let workerRttAvg: number | null = null;
  let workerRttp95: number | null = null;
  if (rttLabels.length > 0) {
    let avgSum = 0;
    let p95Max = -Infinity;
    let count = 0;
    for (const label of rttLabels) {
      const s = perfMetricsStore.getStats(label);
      if (s) {
        avgSum += s.avg;
        p95Max = Math.max(p95Max, s.p95);
        count++;
      }
    }
    if (count > 0) {
      workerRttAvg = avgSum / count;
      workerRttp95 = p95Max;
    }
  }

  // footprint-update:* の集約（avg の平均）
  const fpLabels = labels.filter((l) => l.startsWith("footprint-update:"));
  let fpUpdateAvg: number | null = null;
  if (fpLabels.length > 0) {
    let avgSum = 0;
    let count = 0;
    for (const label of fpLabels) {
      const s = perfMetricsStore.getStats(label);
      if (s) {
        avgSum += s.avg;
        count++;
      }
    }
    if (count > 0) {
      fpUpdateAvg = avgSum / count;
    }
  }

  // heap
  const heapStats = perfMetricsStore.getStats("heap-used-bytes");

  return {
    fpsLatest: fpsStats ? fpsStats.latest : null,
    fpsp95: fpsStats ? fpsStats.p95 : null,
    workerRttAvg,
    workerRttp95,
    fpUpdateAvg,
    cacheSize: orbitCache.size,
    cacheCapacity: orbitCache.capacity,
    cacheBytes: orbitCache.estimatedBytes,
    heapUsedBytes: heapStats ? heapStats.latest : null,
  };
}

function fmt(v: number | null, decimals = 1, unit = ""): string {
  if (v === null) return "N/A";
  return `${v.toFixed(decimals)}${unit}`;
}

function PerfOverlayInner() {
  const [snapshot, setSnapshot] = useState<PerfSnapshot>(() => collectSnapshot());

  useEffect(() => {
    startMonitoring();
    const id = setInterval(() => {
      setSnapshot(collectSnapshot());
    }, 1000);
    return () => {
      clearInterval(id);
      stopMonitoring();
    };
  }, []);

  const heapMB =
    snapshot.heapUsedBytes !== null
      ? snapshot.heapUsedBytes / 1024 / 1024
      : null;
  const cacheMB = snapshot.cacheBytes / 1024 / 1024;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 140,
        right: 8,
        background: "rgba(0, 0, 0, 0.65)",
        color: "#00ff88",
        padding: "8px 12px",
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "monospace",
        lineHeight: 1.8,
        zIndex: 200,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div>FPS: {fmt(snapshot.fpsLatest, 1)} / p95: {fmt(snapshot.fpsp95, 1)}</div>
      <div>
        Worker RTT: {fmt(snapshot.workerRttAvg, 1, "ms")} / p95:{" "}
        {fmt(snapshot.workerRttp95, 1, "ms")}
      </div>
      <div>FP update: {fmt(snapshot.fpUpdateAvg, 3, "ms")}</div>
      <div>
        Cache: {snapshot.cacheSize}/{snapshot.cacheCapacity} ({cacheMB.toFixed(2)} MB)
      </div>
      <div>Heap: {heapMB !== null ? `${heapMB.toFixed(1)} MB` : "N/A"}</div>
    </div>
  );
}

export function PerfOverlay() {
  if (import.meta.env.VITE_PERF_LOG !== "true") return null;
  return <PerfOverlayInner />;
}
