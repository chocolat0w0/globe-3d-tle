import { useState, useEffect, useRef, useCallback } from "react";
import { useOrbitWorker } from "./useWorker";
import type { SwathData } from "../types/orbit";
import type { ComputeDayRequest, MainMessage } from "../types/worker-messages";
import type { SwathParams } from "../lib/tle/swath";
import { LRUCache } from "../lib/cache/lru-cache";

const WINDOW_MS = 4 * 3600 * 1000; // 4時間窓

function getWindowStartMs(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function estimateSwathBytes(value: SwathData): number {
  return value.rings.byteLength + value.offsets.byteLength + value.counts.byteLength;
}

export const swathCache = new LRUCache<SwathData>(30, estimateSwathBytes);

interface UseSwathDataOptions {
  satelliteId: string;
  tle1: string;
  tle2: string;
  swathParams: SwathParams;
  /** 外部から注入する窓開始時刻（ms UTC）。未指定の場合は現在の4時間窓開始を使用。 */
  dayStartMs?: number;
  /** false の場合、Worker計算・先読みをスキップしてデータをnullにリセットする */
  enabled?: boolean;
}

interface UseSwathDataResult {
  swathData: SwathData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Web Worker を使って4時間窓のスワスデータを非同期に取得するフック。
 *
 * - LRUキャッシュを優先参照し、ヒット時は Worker を呼ばない
 * - dayStartMs 変化時に前後1窓を先読みリクエストする
 * - スワスは時刻によらず窓単位で静的なため timeSizes 不要
 */
export function useSwathData({
  satelliteId,
  tle1,
  tle2,
  swathParams,
  dayStartMs: externalDayStartMs,
  enabled = true,
}: UseSwathDataOptions): UseSwathDataResult {
  const [swathData, setSwathData] = useState<SwathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingRequestId = useRef<string | null>(null);
  const prefetchIds = useRef(new Set<string>());

  const paramsKey = JSON.stringify(swathParams);

  const handleMessage = useCallback(
    (msg: MainMessage) => {
      if (msg.type === "error") {
        if (msg.requestId === pendingRequestId.current) {
          setError(msg.message);
          setLoading(false);
        }
        prefetchIds.current.delete(msg.requestId);
        return;
      }

      // --- 先読みレスポンス ---
      if (prefetchIds.current.has(msg.requestId)) {
        prefetchIds.current.delete(msg.requestId);
        if (msg.swath) {
          const data: SwathData = {
            rings: new Float32Array(msg.swath.flat.rings),
            offsets: new Int32Array(msg.swath.flat.offsets),
            counts: new Int32Array(msg.swath.flat.counts),
          };
          const key = `${msg.satelliteId}:${msg.dayStartMs}:${paramsKey}`;
          swathCache.set(key, data);
        }
        return;
      }

      // --- メインレスポンス ---
      if (msg.requestId !== pendingRequestId.current) return;

      if (msg.swath) {
        const data: SwathData = {
          rings: new Float32Array(msg.swath.flat.rings),
          offsets: new Int32Array(msg.swath.flat.offsets),
          counts: new Int32Array(msg.swath.flat.counts),
        };
        const key = `${msg.satelliteId}:${msg.dayStartMs}:${paramsKey}`;
        swathCache.set(key, data);
        setSwathData(data);
        setError(null);
      }
      setLoading(false);
    },
    [paramsKey],
  );

  const { postMessage } = useOrbitWorker(handleMessage);

  const postMessageRef = useRef(postMessage);
  postMessageRef.current = postMessage;

  // enabled=false になったとき、5秒デバウンスでこの衛星のキャッシュを解放する
  useEffect(() => {
    if (enabled) return;
    const timer = setTimeout(() => {
      swathCache.deleteByPrefix(`${satelliteId}:`);
    }, 5000);
    return () => clearTimeout(timer);
  }, [enabled, satelliteId]);

  // メインリクエスト
  useEffect(() => {
    if (!enabled) {
      setSwathData(null);
      setLoading(false);
      return;
    }
    const windowStartMs = externalDayStartMs ?? getWindowStartMs(Date.now());
    const cacheKey = `${satelliteId}:${windowStartMs}:${paramsKey}`;

    const cached = swathCache.get(cacheKey);
    if (cached) {
      setSwathData(cached);
      setLoading(false);
      setError(null);
      pendingRequestId.current = null;
      return;
    }

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
      dayStartMs: windowStartMs,
      durationMs: WINDOW_MS,
      stepSec: 30, // swath では使用しないが型の都合で必要
      outputs: { orbit: false, footprint: false, swath: true },
      swathParams,
    };

    postMessageRef.current(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteId, tle1, tle2, externalDayStartMs, paramsKey, enabled]);

  // 先読み: W-1 / W+1 をバックグラウンドで取得
  useEffect(() => {
    if (!enabled) return;
    const windowStartMs = externalDayStartMs ?? getWindowStartMs(Date.now());

    for (const offset of [-WINDOW_MS, WINDOW_MS]) {
      const targetDay = windowStartMs + offset;
      const cacheKey = `${satelliteId}:${targetDay}:${paramsKey}`;
      if (swathCache.has(cacheKey)) continue;

      const requestId = generateRequestId();
      prefetchIds.current.add(requestId);

      const request: ComputeDayRequest = {
        type: "compute-day",
        requestId,
        satelliteId,
        tle1,
        tle2,
        dayStartMs: targetDay,
        durationMs: WINDOW_MS,
        stepSec: 30,
        outputs: { orbit: false, footprint: false, swath: true },
        swathParams,
      };

      postMessageRef.current(request);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteId, tle1, tle2, externalDayStartMs, paramsKey, enabled]);

  return { swathData, loading, error };
}
