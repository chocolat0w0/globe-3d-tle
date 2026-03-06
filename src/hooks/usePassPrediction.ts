import { useState, useEffect, useRef, useCallback } from "react";
import type { Satellite } from "../types/satellite";
import type { Aoi } from "../types/polygon";
import type { Pass } from "../types/pass";
import type { FootprintData } from "../types/orbit";
import type { FootprintParams } from "../lib/tle/footprint";
import type { ComputeDayRequest, MainMessage } from "../types/worker-messages";
import { footprintCache } from "./useFootprintData";
import { useOrbitWorker } from "./useWorker";
import { WINDOW_MS, generateRequestId } from "../lib/time-window";
import { computePasses } from "../lib/pass-prediction/compute-passes";

export interface UsePassPredictionOptions {
  satellites: Satellite[];
  aoi: Aoi | null;
  windowStartMs: number;
  stepSec: number;
  /** スキャンする4時間窓の数。1=4h, 6=24h, 12=48h */
  scanWindowCount: number;
  /** インクリメントで計算開始するトリガー */
  trigger: number;
}

export interface UsePassPredictionResult {
  passes: Pass[];
  loading: boolean;
  progress: { current: number; total: number } | null;
  error: string | null;
}

/**
 * AOI通過予測フック。
 *
 * trigger が変化すると、visible な衛星の FootprintData をキャッシュ/Worker から取得し、
 * AOI との交差判定を実行して Pass[] を返す。
 *
 * - キャッシュ済みの窓はそのまま使用
 * - 未キャッシュの窓は Worker に計算要求を発行
 * - 全窓のデータが揃ったら computePasses() を実行
 */
export function usePassPrediction({
  satellites,
  aoi,
  windowStartMs,
  stepSec,
  scanWindowCount,
  trigger,
}: UsePassPredictionOptions): UsePassPredictionResult {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 世代カウンター: trigger 変更時に古い計算を無効化
  const generationRef = useRef(0);
  // 待機中のWorkerリクエストを追跡
  const pendingRequestsRef = useRef(new Map<string, { satelliteId: string; windowStart: number }>());
  // 受信済みデータを蓄積
  const collectedDataRef = useRef(
    new Map<string, FootprintData>(),
  );

  const handleWorkerMessage = useCallback(
    (msg: MainMessage) => {
      const pending = pendingRequestsRef.current.get(msg.requestId);
      if (!pending) return; // 古い世代 or 不明なリクエスト

      pendingRequestsRef.current.delete(msg.requestId);

      if (msg.type === "error") {
        // エラーは無視してスキップ（他の窓の計算は続行）
        return;
      }

      if (msg.footprint) {
        const data: FootprintData = {
          timesMs: new Float64Array(msg.footprint.timesMs),
          rings: new Float32Array(msg.footprint.flat.rings),
          offsets: new Int32Array(msg.footprint.flat.offsets),
          counts: new Int32Array(msg.footprint.flat.counts),
          timeSizes: new Int32Array(msg.footprint.timeSizes),
        };
        const paramsKey = buildParamsKey(pending.satelliteId, satellites);
        const cacheKey = `${pending.satelliteId}:${pending.windowStart}:${stepSec}:${paramsKey}`;
        footprintCache.set(cacheKey, data);
        collectedDataRef.current.set(cacheKey, data);
      }
    },
    [satellites, stepSec],
  );

  const { postMessage } = useOrbitWorker(handleWorkerMessage);
  const postMessageRef = useRef(postMessage);
  postMessageRef.current = postMessage;

  useEffect(() => {
    if (!aoi || trigger === 0) return;

    const generation = ++generationRef.current;

    // 前回の待機リクエストをクリア
    pendingRequestsRef.current.clear();
    collectedDataRef.current.clear();

    const visibleSats = satellites.filter((s) => s.visible && s.showFootprint);
    if (visibleSats.length === 0) {
      setPasses([]);
      setLoading(false);
      setProgress(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPasses([]);

    const totalUnits = visibleSats.length * scanWindowCount;
    let completedUnits = 0;
    setProgress({ current: 0, total: totalUnits });

    // 必要な全 (satellite, window) ペアのデータを収集
    interface ScanUnit {
      sat: Satellite;
      windowStart: number;
      cacheKey: string;
      data: FootprintData | null;
    }

    const scanUnits: ScanUnit[] = [];

    for (const sat of visibleSats) {
      const paramsKey = buildParamsKeyFromSat(sat);
      for (let w = 0; w < scanWindowCount; w++) {
        const ws = windowStartMs + w * WINDOW_MS;
        const cacheKey = `${sat.id}:${ws}:${stepSec}:${paramsKey}`;
        const cached = footprintCache.get(cacheKey);

        if (cached) {
          collectedDataRef.current.set(cacheKey, cached);
          scanUnits.push({ sat, windowStart: ws, cacheKey, data: cached });
          completedUnits++;
        } else {
          // Worker に計算要求
          const requestId = generateRequestId();
          pendingRequestsRef.current.set(requestId, {
            satelliteId: sat.id,
            windowStart: ws,
          });

          const footprintParams: FootprintParams = {
            fov: [sat.crossTrackFovDeg, 10],
            offnadirRanges: sat.offnadirRanges,
          };

          const request: ComputeDayRequest = {
            type: "compute-day",
            requestId,
            satelliteId: sat.id,
            tle1: sat.tle.line1,
            tle2: sat.tle.line2,
            dayStartMs: ws,
            durationMs: WINDOW_MS,
            stepSec,
            outputs: { orbit: false, footprint: true, swath: false },
            footprintParams,
          };

          postMessageRef.current(request);
          scanUnits.push({ sat, windowStart: ws, cacheKey, data: null });
        }
      }
    }

    setProgress({ current: completedUnits, total: totalUnits });

    // 定期的にデータ到着をチェックし、全データが揃ったら計算実行
    const checkInterval = setInterval(() => {
      if (generationRef.current !== generation) {
        clearInterval(checkInterval);
        return;
      }

      // 未取得データの更新
      let allReady = true;
      let readyCount = 0;
      for (const unit of scanUnits) {
        if (unit.data) {
          readyCount++;
          continue;
        }
        const fromCollected = collectedDataRef.current.get(unit.cacheKey);
        if (fromCollected) {
          unit.data = fromCollected;
          readyCount++;
        } else {
          allReady = false;
        }
      }

      setProgress({ current: readyCount, total: totalUnits });

      if (!allReady && pendingRequestsRef.current.size > 0) {
        return; // まだ待ち
      }

      // 全データ揃った or 待ちリクエストがなくなった → 計算実行
      clearInterval(checkInterval);

      if (generationRef.current !== generation) return;

      // computePasses を requestIdleCallback で非同期実行
      const runComputation = () => {
        if (generationRef.current !== generation) return;

        const allPasses: Pass[] = [];
        const currentAoi = aoi; // クロージャで保持

        for (const unit of scanUnits) {
          if (!unit.data) continue;
          const unitPasses = computePasses({
            satelliteId: unit.sat.id,
            satelliteName: unit.sat.name,
            satelliteColor: unit.sat.color,
            footprintData: unit.data,
            aoi: currentAoi,
            windowStartMs: unit.windowStart,
          });
          allPasses.push(...unitPasses);
        }

        // startMs でソート
        allPasses.sort((a, b) => a.startMs - b.startMs);

        if (generationRef.current !== generation) return;

        setPasses(allPasses);
        setLoading(false);
        setProgress(null);
      };

      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(runComputation);
      } else {
        setTimeout(runComputation, 0);
      }
    }, 100);

    return () => {
      clearInterval(checkInterval);
    };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  // trigger のみに依存: ボタン押下でのみ計算を開始する

  return { passes, loading, progress, error };
}

/** Satellite から FootprintParams の JSON キーを生成 */
function buildParamsKeyFromSat(sat: Satellite): string {
  const params: FootprintParams = {
    fov: [sat.crossTrackFovDeg, 10],
    offnadirRanges: sat.offnadirRanges,
  };
  return JSON.stringify(params);
}

/** satellites 配列から特定衛星の paramsKey を取得 */
function buildParamsKey(satelliteId: string, satellites: Satellite[]): string {
  const sat = satellites.find((s) => s.id === satelliteId);
  if (!sat) return "";
  return buildParamsKeyFromSat(sat);
}
