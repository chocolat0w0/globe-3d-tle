import { useState, useEffect, useRef, useCallback } from "react";
import { useOrbitWorker } from "./useWorker";
import type { OrbitData } from "../types/orbit";
import type {
  ComputeDayRequest,
  MainMessage,
} from "../types/worker-messages";
import { LRUCache } from "../lib/cache/lru-cache";

const DAY_MS = 86400000;

/** UTC 00:00 に丸めた日開始時刻を返す */
function getDayStartMs(now: number): number {
  return now - (now % DAY_MS);
}

function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * モジュールレベルのLRUキャッシュ（10機 × 7日 = 70エントリを保持）
 * モジュールの寿命全体で共有され、衛星・日付を跨いで再利用される。
 */
const orbitCache = new LRUCache<OrbitData>(70);

interface UseOrbitDataOptions {
  satelliteId: string;
  tle1: string;
  tle2: string;
  stepSec?: number;
  /** 外部から注入する日開始時刻（ms UTC）。未指定の場合は当日0時を使用。 */
  dayStartMs?: number;
}

interface UseOrbitDataResult {
  orbitData: OrbitData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Web Worker を使って1日分の軌道データを非同期に取得するフック。
 *
 * - LRUキャッシュを優先参照し、ヒット時は Worker を呼ばない
 * - dayStartMs 変化時に前後1日を先読みリクエストする
 * - 古いレスポンスは requestId で排除（競合防止）
 */
export function useOrbitData({
  satelliteId,
  tle1,
  tle2,
  stepSec = 30,
  dayStartMs: externalDayStartMs,
}: UseOrbitDataOptions): UseOrbitDataResult {
  const [orbitData, setOrbitData] = useState<OrbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 現在進行中のメインリクエスト ID */
  const pendingRequestId = useRef<string | null>(null);
  /** 先読みリクエスト ID の集合 */
  const prefetchIds = useRef(new Set<string>());

  const handleMessage = useCallback((msg: MainMessage) => {
    if (msg.type === "error") {
      // 先読みエラーは無視、メインリクエストのエラーのみ通知
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
      if (msg.orbit) {
        const data: OrbitData = {
          timesMs: new Float64Array(msg.orbit.timesMs),
          ecef: new Float32Array(msg.orbit.ecef),
        };
        const key = `${msg.satelliteId}:${msg.dayStartMs}:${msg.stepSec}`;
        orbitCache.set(key, data);
      }
      return;
    }

    // --- メインレスポンス ---
    if (msg.requestId !== pendingRequestId.current) return;

    if (msg.orbit) {
      const data: OrbitData = {
        timesMs: new Float64Array(msg.orbit.timesMs),
        ecef: new Float32Array(msg.orbit.ecef),
      };
      const key = `${msg.satelliteId}:${msg.dayStartMs}:${msg.stepSec}`;
      orbitCache.set(key, data);
      setOrbitData(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const { postMessage } = useOrbitWorker(handleMessage);

  // postMessage の最新参照を ref に保持（先読みエフェクトから参照するため）
  const postMessageRef = useRef(postMessage);
  postMessageRef.current = postMessage;

  // メインリクエスト: dayStartMs / TLE / stepSec が変化したとき
  useEffect(() => {
    const dayStartMs = externalDayStartMs ?? getDayStartMs(Date.now());
    const cacheKey = `${satelliteId}:${dayStartMs}:${stepSec}`;

    // キャッシュヒット → Worker 不要
    const cached = orbitCache.get(cacheKey);
    if (cached) {
      setOrbitData(cached);
      setLoading(false);
      setError(null);
      pendingRequestId.current = null;
      return;
    }

    // キャッシュミス → Worker にリクエスト
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
      outputs: { orbit: true, footprint: false, swath: false },
    };

    postMessageRef.current(request);
    // postMessageRef は安定した ref のため deps に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteId, tle1, tle2, stepSec, externalDayStartMs]);

  // 先読み: dayStartMs 変化時に D-1 / D+1 をバックグラウンドで取得
  useEffect(() => {
    const dayStartMs = externalDayStartMs ?? getDayStartMs(Date.now());

    for (const offset of [-DAY_MS, DAY_MS]) {
      const targetDay = dayStartMs + offset;
      const cacheKey = `${satelliteId}:${targetDay}:${stepSec}`;
      if (orbitCache.has(cacheKey)) continue;

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
        outputs: { orbit: true, footprint: false, swath: false },
      };

      postMessageRef.current(request);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satelliteId, tle1, tle2, stepSec, externalDayStartMs]);

  return { orbitData, loading, error };
}
