import { useEffect, useRef } from "react";
import type { WorkerMessage, MainMessage } from "../types/worker-messages";
import { perfLogger } from "../lib/perf/perf-logger";
import { perfMetricsStore } from "../lib/perf/perf-metrics-store";

const rttLabel = (satId: string, reqId: string) =>
  `worker-rtt:${satId}:${reqId.slice(0, 8)}`;

/**
 * orbit-calculator Worker を管理するフック
 *
 * - コンポーネントのマウント時に Worker を生成し、アンマウント時に terminate する
 * - onMessage コールバックは最新の参照を保持する（deps に含める必要なし）
 */
export function useOrbitWorker(onMessage: (msg: MainMessage) => void) {
  const workerRef = useRef<Worker | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/orbit-calculator.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<MainMessage>) => {
      const { satelliteId, requestId } = e.data;
      const label = rttLabel(satelliteId, requestId);
      const entry = perfLogger.end(label);
      if (entry) perfMetricsStore.push(entry);
      onMessageRef.current(e.data);
    };

    worker.onerror = (e) => {
      console.error("[OrbitWorker] uncaught error:", e.message);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function postMessage(msg: WorkerMessage) {
    const label = rttLabel(msg.satelliteId, msg.requestId);
    perfLogger.start(label);
    workerRef.current?.postMessage(msg);
  }

  return { postMessage };
}
