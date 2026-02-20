import { useEffect, useRef } from "react";
import type { WorkerMessage, MainMessage } from "../types/worker-messages";

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
    workerRef.current?.postMessage(msg);
  }

  return { postMessage };
}
