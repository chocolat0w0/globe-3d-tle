import { useRef } from "react";
import type { WorkerMessage, MainMessage } from "../types/worker-messages";
import { workerPool } from "../lib/worker-pool";

/**
 * シングルトン WorkerPool 経由で orbit-calculator にメッセージを送るフック。
 *
 * - コンポーネントごとに Worker を生成せず、プールを共有するため Worker 数が抑制される
 * - onMessage コールバックは最新の参照を保持する（deps に含める必要なし）
 */
export function useOrbitWorker(onMessage: (msg: MainMessage) => void) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  function postMessage(msg: WorkerMessage) {
    workerPool.post(msg, (response) => onMessageRef.current(response));
  }

  return { postMessage };
}
