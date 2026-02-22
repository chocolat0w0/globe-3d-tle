import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { perfMetricsStore } from "../../../lib/perf/perf-metrics-store";
import { startMonitoring, stopMonitoring } from "../../../lib/perf/memory-monitor";
import { PerfOverlay } from "../PerfOverlay";

// memory-monitor をモック（startMonitoring / stopMonitoring は副作用なし）
vi.mock("../../../lib/perf/memory-monitor", () => ({
  startMonitoring: vi.fn(),
  stopMonitoring: vi.fn(),
  isMonitoring: vi.fn(() => false),
}));

// useOrbitData の orbitCache をモック（size=3, capacity=70 の固定値）
vi.mock("../../../hooks/useOrbitData", () => ({
  orbitCache: { size: 3, capacity: 70, estimatedBytes: 0 },
}));

describe("PerfOverlay", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // VITE_PERF_LOG が "true" でない場合
  // ──────────────────────────────────────────────────────────────────────────

  describe("VITE_PERF_LOG が 'true' でないとき", () => {
    beforeEach(() => {
      vi.stubEnv("VITE_PERF_LOG", "false");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("何も描画しない", () => {
      const { container } = render(<PerfOverlay />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VITE_PERF_LOG === "true" の場合
  // ──────────────────────────────────────────────────────────────────────────

  describe("VITE_PERF_LOG === 'true' のとき", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubEnv("VITE_PERF_LOG", "true");
      perfMetricsStore.clear();
      vi.mocked(startMonitoring).mockClear();
      vi.mocked(stopMonitoring).mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    it("オーバーレイが表示される", () => {
      render(<PerfOverlay />);
      expect(screen.getByText(/FPS:/)).toBeInTheDocument();
    });

    it("FPS stats（latest と p95）が正しく表示される", () => {
      // 10件 60ms → latest を 55ms で上書き
      for (let i = 0; i < 10; i++) {
        perfMetricsStore.push({ label: "fps", durationMs: 60, timestamp: i });
      }
      perfMetricsStore.push({ label: "fps", durationMs: 55, timestamp: 10 });

      render(<PerfOverlay />);

      // latest=55 が表示されていること
      expect(screen.getByText(/FPS: 55\.0/)).toBeInTheDocument();
    });

    it("worker-rtt:* ラベルのワイルドカード集約 avg が正しい（各ラベル avg の平均）", () => {
      perfMetricsStore.push({ label: "worker-rtt:sat1", durationMs: 100, timestamp: 0 });
      perfMetricsStore.push({ label: "worker-rtt:sat2", durationMs: 200, timestamp: 0 });

      render(<PerfOverlay />);

      // avg = (100 + 200) / 2 = 150.0ms
      expect(screen.getByText(/Worker RTT: 150\.0ms/)).toBeInTheDocument();
    });

    it("worker-rtt:* ラベルのワイルドカード集約 p95 が正しい（各ラベル p95 の最大値）", () => {
      // sat1 に 100ms を 5件（p95=100ms）、sat2 に 200ms を 5件（p95=200ms）
      for (let i = 0; i < 5; i++) {
        perfMetricsStore.push({ label: "worker-rtt:sat1", durationMs: 100, timestamp: i });
        perfMetricsStore.push({ label: "worker-rtt:sat2", durationMs: 200, timestamp: i });
      }

      render(<PerfOverlay />);

      // p95 = max(100, 200) = 200.0ms
      expect(screen.getByText(/p95: 200\.0ms/)).toBeInTheDocument();
    });

    it("キャッシュの size / capacity が表示される", () => {
      render(<PerfOverlay />);

      // mock: size=3, capacity=70
      expect(screen.getByText(/Cache: 3\/70/)).toBeInTheDocument();
    });

    it("ヒープメモリデータがない場合 'N/A' と表示される", () => {
      // heap-used-bytes エントリなし（perfMetricsStore.clear() 済み）
      render(<PerfOverlay />);

      expect(screen.getByText(/Heap: N\/A/)).toBeInTheDocument();
    });

    it("mount 時に startMonitoring が呼ばれる", () => {
      render(<PerfOverlay />);

      expect(startMonitoring).toHaveBeenCalledTimes(1);
    });

    it("unmount 時に stopMonitoring が呼ばれる", () => {
      const { unmount } = render(<PerfOverlay />);
      unmount();

      expect(stopMonitoring).toHaveBeenCalledTimes(1);
    });
  });
});
