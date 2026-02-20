import { useState, useEffect, useRef, useCallback } from "react";
import { useOrbitWorker } from "./useWorker";
import type { OrbitData } from "../types/orbit";
import type {
  ComputeDayRequest,
  MainMessage,
} from "../types/worker-messages";

/** UTC 00:00 に丸めた日開始時刻を返す */
function getDayStartMs(now: number): number {
  return now - (now % 86400000);
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface UseOrbitDataOptions {
  satelliteId: string;
  tle1: string;
  tle2: string;
  stepSec?: number;
}

interface UseOrbitDataResult {
  orbitData: OrbitData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Web Worker を使って1日分の軌道データを非同期に取得するフック
 *
 * - tle1/tle2/satelliteId が変わるたびに再計算
 * - 古いレスポンスは requestId で排除（競合防止）
 */
export function useOrbitData({
  satelliteId,
  tle1,
  tle2,
  stepSec = 30,
}: UseOrbitDataOptions): UseOrbitDataResult {
  const [orbitData, setOrbitData] = useState<OrbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingRequestId = useRef<string | null>(null);

  const handleMessage = useCallback((msg: MainMessage) => {
    if (msg.requestId !== pendingRequestId.current) return;

    if (msg.type === "error") {
      setError(msg.message);
      setLoading(false);
      return;
    }

    if (msg.orbit) {
      setOrbitData({
        timesMs: new Float64Array(msg.orbit.timesMs),
        ecef: new Float32Array(msg.orbit.ecef),
      });
      setError(null);
    }
    setLoading(false);
  }, []);

  const { postMessage } = useOrbitWorker(handleMessage);

  useEffect(() => {
    const dayStartMs = getDayStartMs(Date.now());
    const requestId = generateRequestId();
    pendingRequestId.current = requestId;

    setLoading(true);
    setError(null);

    const request: ComputeDayRequest = {
      type: "compute-day",
      requestId,
      satelliteId,
      tle1,
      tle2,
      dayStartMs,
      durationMs: 86400000,
      stepSec,
      outputs: { orbit: true, footprint: false, swath: false },
    };

    postMessage(request);
    // postMessage は useOrbitWorker 内の安定した関数参照のため deps に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteId, tle1, tle2, stepSec]);

  return { orbitData, loading, error };
}
