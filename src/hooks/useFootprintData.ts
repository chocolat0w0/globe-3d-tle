import { useState, useEffect, useRef, useCallback } from "react";
import { useOrbitWorker } from "./useWorker";
import type { FootprintData } from "../types/orbit";
import type {
  ComputeDayRequest,
  MainMessage,
} from "../types/worker-messages";
import type { FootprintParams } from "../lib/tle/footprint";
import { LRUCache } from "../lib/cache/lru-cache";

const DAY_MS = 86400000;

function getDayStartMs(now: number): number {
  return now - (now % DAY_MS);
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * モジュールレベルのLRUキャッシュ（10機 × 7日 = 70エントリを保持）
 */
const footprintCache = new LRUCache<FootprintData>(70);

interface UseFootprintDataOptions {
  satelliteId: string;
  tle1: string;
  tle2: string;
  footprintParams: FootprintParams;
  stepSec?: number;
  /** 外部から注入する日開始時刻（ms UTC）。未指定の場合は当日0時を使用。 */
  dayStartMs?: number;
}

interface UseFootprintDataResult {
  footprintData: FootprintData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Web Worker を使って1日分のフットプリントデータを非同期に取得するフック。
 *
 * - LRUキャッシュを優先参照し、ヒット時は Worker を呼ばない
 * - dayStartMs 変化時に前後1日を先読みリクエストする
 * - 古いレスポンスは requestId で排除（競合防止）
 */
export function useFootprintData({
  satelliteId,
  tle1,
  tle2,
  footprintParams,
  stepSec = 30,
  dayStartMs: externalDayStartMs,
}: UseFootprintDataOptions): UseFootprintDataResult {
  const [footprintData, setFootprintData] = useState<FootprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pendingRequestId = useRef<string | null>(null);
  const prefetchIds = useRef(new Set<string>());

  // footprintParams の変化を検知するため JSON 文字列でキー化
  const paramsKey = JSON.stringify(footprintParams);

  const handleMessage = useCallback((msg: MainMessage) => {
    if (msg.type === "error") {
      if (msg.requestId === pendingRequestId.current) {
        setError(msg.message);
        setLoading(false);
      }
      prefetchIds.current.delete(msg.requestId);
      return;
    }

    // --- 先読みレスポンス: キャッシュに保存するだけ ---
    if (prefetchIds.current.has(msg.requestId)) {
      prefetchIds.current.delete(msg.requestId);
      if (msg.footprint) {
        const data: FootprintData = {
          timesMs: new Float64Array(msg.footprint.timesMs),
          rings: new Float32Array(msg.footprint.flat.rings),
          offsets: new Int32Array(msg.footprint.flat.offsets),
          counts: new Int32Array(msg.footprint.flat.counts),
          timeSizes: new Int32Array(msg.footprint.timeSizes),
        };
        const key = `${msg.satelliteId}:${msg.dayStartMs}:${msg.stepSec}:${paramsKey}`;
        footprintCache.set(key, data);
      }
      return;
    }

    // --- メインレスポンス ---
    if (msg.requestId !== pendingRequestId.current) return;

    if (msg.footprint) {
      const data: FootprintData = {
        timesMs: new Float64Array(msg.footprint.timesMs),
        rings: new Float32Array(msg.footprint.flat.rings),
        offsets: new Int32Array(msg.footprint.flat.offsets),
        counts: new Int32Array(msg.footprint.flat.counts),
        timeSizes: new Int32Array(msg.footprint.timeSizes),
      };
      const key = `${msg.satelliteId}:${msg.dayStartMs}:${msg.stepSec}:${paramsKey}`;
      footprintCache.set(key, data);
      setFootprintData(data);
      setError(null);
    }
    setLoading(false);
  }, [paramsKey]);

  const { postMessage } = useOrbitWorker(handleMessage);

  const postMessageRef = useRef(postMessage);
  postMessageRef.current = postMessage;

  // メインリクエスト
  useEffect(() => {
    const dayStartMs = externalDayStartMs ?? getDayStartMs(Date.now());
    const cacheKey = `${satelliteId}:${dayStartMs}:${stepSec}:${paramsKey}`;

    const cached = footprintCache.get(cacheKey);
    if (cached) {
      setFootprintData(cached);
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
      dayStartMs,
      durationMs: DAY_MS,
      stepSec,
      outputs: { orbit: false, footprint: true, swath: false },
      footprintParams,
    };

    postMessageRef.current(request);
  }, [satelliteId, tle1, tle2, stepSec, externalDayStartMs, paramsKey, footprintParams]);

  // 先読み: D-1 / D+1 をバックグラウンドで取得
  useEffect(() => {
    const dayStartMs = externalDayStartMs ?? getDayStartMs(Date.now());

    for (const offset of [-DAY_MS, DAY_MS]) {
      const targetDay = dayStartMs + offset;
      const cacheKey = `${satelliteId}:${targetDay}:${stepSec}:${paramsKey}`;
      if (footprintCache.has(cacheKey)) continue;

      const requestId = generateRequestId();
      prefetchIds.current.add(requestId);

      const request: ComputeDayRequest = {
        type: "compute-day",
        requestId,
        satelliteId,
        tle1,
        tle2,
        dayStartMs: targetDay,
        durationMs: DAY_MS,
        stepSec,
        outputs: { orbit: false, footprint: true, swath: false },
        footprintParams,
      };

      postMessageRef.current(request);
    }
  }, [satelliteId, tle1, tle2, stepSec, externalDayStartMs, paramsKey, footprintParams]);

  return { footprintData, loading, error };
}
