/// <reference lib="dom" />
import type { WorkerMessage, MainMessage } from "../types/worker-messages";
import { perfLogger } from "./perf/perf-logger";
import { perfMetricsStore } from "./perf/perf-metrics-store";

const rttLabel = (satId: string, reqId: string) => `worker-rtt:${satId}:${reqId.slice(0, 8)}`;

interface PendingRequest {
  msg: WorkerMessage;
  callback: (msg: MainMessage) => void;
}

// ─── 関数クロージャ ──────────────────────────────────────────────────────────

/**
 * orbit-calculator Worker のシングルトンプール。
 *
 * - プールサイズ = Math.min(navigator.hardwareConcurrency || 4, 6)
 * - requestId → callback のマップでレスポンスをルーティング
 * - アイドルWorkerがなければリクエストをキューに積む
 */
const createWorkerPool = () => {
  const workers: Worker[] = [];
  const idle: Worker[] = [];
  const callbacks = new Map<string, (msg: MainMessage) => void>();
  const queue: PendingRequest[] = [];
  const activeRequestId = new Map<Worker, string>();
  let initialized = false;

  const dispatch = (
    worker: Worker,
    msg: WorkerMessage,
    callback: (msg: MainMessage) => void,
  ): void => {
    const label = rttLabel(msg.satelliteId, msg.requestId);
    perfLogger.start(label);
    callbacks.set(msg.requestId, callback);
    activeRequestId.set(worker, msg.requestId);
    worker.postMessage(msg);
  };

  const releaseWorker = (worker: Worker): void => {
    const next = queue.shift();
    if (next) {
      dispatch(worker, next.msg, next.callback);
    } else {
      idle.push(worker);
    }
  };

  /**
   * 初回 post() 呼び出し時に Worker を生成する（遅延初期化）。
   * テスト環境（Worker未定義）でもモジュールをインポートできる。
   */
  const init = (): void => {
    if (initialized) return;
    initialized = true;

    const size = Math.min(
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
      6,
    );

    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL("../workers/orbit-calculator.worker.ts", import.meta.url), {
        type: "module",
      });

      worker.onmessage = (e: MessageEvent<MainMessage>) => {
        const msg = e.data;
        const { satelliteId, requestId } = msg;
        const label = rttLabel(satelliteId, requestId);
        const entry = perfLogger.end(label);
        if (entry) perfMetricsStore.push(entry);

        activeRequestId.delete(worker);

        const cb = callbacks.get(requestId);
        if (cb) {
          callbacks.delete(requestId);
          cb(msg);
        }

        releaseWorker(worker);
      };

      worker.onerror = (e) => {
        console.error("[WorkerPool] uncaught error:", e.message);
        const requestId = activeRequestId.get(worker);
        activeRequestId.delete(worker);
        if (requestId) {
          const cb = callbacks.get(requestId);
          if (cb) {
            callbacks.delete(requestId);
            cb({
              type: "error",
              requestId,
              satelliteId: "",
              message: e.message ?? "Worker crashed",
            });
          }
        }
        releaseWorker(worker);
      };

      workers.push(worker);
      idle.push(worker);
    }
  };

  return {
    post: (msg: WorkerMessage, callback: (msg: MainMessage) => void): void => {
      init();
      const worker = idle.pop();
      if (worker) {
        dispatch(worker, msg, callback);
      } else {
        queue.push({ msg, callback });
      }
    },
    get poolSize(): number {
      return workers.length;
    },
  };
};

// ─── 公開API（シングルトン） ─────────────────────────────────────────────────

export const workerPool = createWorkerPool();
