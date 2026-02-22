/// <reference lib="dom" />
import type { WorkerMessage, MainMessage } from "../types/worker-messages";
import { perfLogger } from "./perf/perf-logger";
import { perfMetricsStore } from "./perf/perf-metrics-store";

const rttLabel = (satId: string, reqId: string) =>
  `worker-rtt:${satId}:${reqId.slice(0, 8)}`;

interface PendingRequest {
  msg: WorkerMessage;
  callback: (msg: MainMessage) => void;
}

/**
 * orbit-calculator Worker のシングルトンプール。
 *
 * - プールサイズ = Math.min(navigator.hardwareConcurrency || 4, 6)
 * - requestId → callback のマップでレスポンスをルーティング
 * - アイドルWorkerがなければリクエストをキューに積む
 */
export class WorkerPool {
  private readonly workers: Worker[];
  private readonly idle: Worker[];
  private readonly callbacks = new Map<string, (msg: MainMessage) => void>();
  private readonly queue: PendingRequest[] = [];

  constructor(size: number) {
    this.workers = [];
    this.idle = [];

    for (let i = 0; i < size; i++) {
      const worker = new Worker(
        new URL("../workers/orbit-calculator.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (e: MessageEvent<MainMessage>) => {
        const msg = e.data;
        const { satelliteId, requestId } = msg;
        const label = rttLabel(satelliteId, requestId);
        const entry = perfLogger.end(label);
        if (entry) perfMetricsStore.push(entry);

        const cb = this.callbacks.get(requestId);
        if (cb) {
          this.callbacks.delete(requestId);
          cb(msg);
        }

        // Workerをアイドルに戻し、キューから次のリクエストを処理
        this.releaseWorker(worker);
      };

      worker.onerror = (e) => {
        console.error("[WorkerPool] uncaught error:", e.message);
        this.releaseWorker(worker);
      };

      this.workers.push(worker);
      this.idle.push(worker);
    }
  }

  post(msg: WorkerMessage, callback: (msg: MainMessage) => void): void {
    const worker = this.idle.pop();
    if (worker) {
      this.dispatch(worker, msg, callback);
    } else {
      this.queue.push({ msg, callback });
    }
  }

  private dispatch(
    worker: Worker,
    msg: WorkerMessage,
    callback: (msg: MainMessage) => void
  ): void {
    const label = rttLabel(msg.satelliteId, msg.requestId);
    perfLogger.start(label);
    this.callbacks.set(msg.requestId, callback);
    worker.postMessage(msg);
  }

  private releaseWorker(worker: Worker): void {
    const next = this.queue.shift();
    if (next) {
      this.dispatch(worker, next.msg, next.callback);
    } else {
      this.idle.push(worker);
    }
  }

  get poolSize(): number {
    return this.workers.length;
  }
}

const POOL_SIZE = Math.min(
  typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4,
  6
);

/**
 * アプリ全体で共有するシングルトンWorkerプール。
 *
 * モジュール読み込み時に Worker を生成せず、初回 post() 呼び出し時に生成する（遅延初期化）。
 * これによりテスト環境（Worker未定義）でもモジュールをインポートできる。
 */
let _instance: WorkerPool | null = null;

function getInstance(): WorkerPool {
  if (!_instance) {
    _instance = new WorkerPool(POOL_SIZE);
  }
  return _instance;
}

export const workerPool = {
  post(msg: WorkerMessage, callback: (msg: MainMessage) => void): void {
    getInstance().post(msg, callback);
  },
  get poolSize(): number {
    return _instance?.poolSize ?? 0;
  },
};
