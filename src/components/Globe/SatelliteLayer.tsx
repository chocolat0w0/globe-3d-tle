import { useMemo, useEffect, useRef } from "react";
import { Entity, useCesium } from "resium";
import {
  CallbackPositionProperty,
  JulianDate,
  Cartesian3,
  Cartesian2,
  Color,
  DistanceDisplayCondition,
  type Entity as CesiumEntity,
} from "cesium";
import { useOrbitData } from "../../hooks/useOrbitData";
import type { TLEData } from "../../types/satellite";
import type { OrbitData, OrbitRenderMode } from "../../types/orbit";
import { toCesiumArcType } from "./orbit-render-mode";
import { PerfLogger } from "../../lib/perf/perf-logger";
import { perfMetricsStore } from "../../lib/perf/perf-metrics-store";

interface Props {
  id: string;
  name: string;
  tle: TLEData;
  color: string;
  visible?: boolean;
  selected?: boolean;
  /** 表示する日の開始時刻（UTC epoch ms）。未指定時は当日0時を使用。 */
  dayStartMs?: number;
  orbitRenderMode: OrbitRenderMode;
  /** 軌道サンプリング間隔（秒）。デフォルト 30。 */
  stepSec?: number;
}

/**
 * timesMs を二分探索して targetMs 以下の最大インデックスを返す。
 * targetMs が範囲外の場合はクランプする。
 */
function bisectLeft(timesMs: Float64Array, targetMs: number): number {
  let lo = 0;
  let hi = timesMs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timesMs[mid] <= targetMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Float32Array の ECEF データから、指定時刻を線形補間して Cartesian3 を返す。
 * SampledPositionProperty の代替として、追加メモリを使わずに動点位置を計算する。
 */
function buildCallbackPosition(data: OrbitData): CallbackPositionProperty {
  return new CallbackPositionProperty((julianDate: JulianDate | undefined, result?: Cartesian3) => {
    if (!julianDate) return undefined;
    const targetMs = JulianDate.toDate(julianDate).getTime();
    const { timesMs, ecef } = data;
    const n = timesMs.length;
    if (n === 0) return undefined;

    const i = bisectLeft(timesMs, targetMs);

    // 端点クランプ
    if (i >= n - 1) {
      const off = (n - 1) * 3;
      return Cartesian3.fromElements(ecef[off], ecef[off + 1], ecef[off + 2], result);
    }

    const t0 = timesMs[i];
    const t1 = timesMs[i + 1];
    const dt = t1 - t0;
    const alpha = dt > 0 ? (targetMs - t0) / dt : 0;

    const off0 = i * 3;
    const off1 = (i + 1) * 3;
    const x = ecef[off0] + alpha * (ecef[off1] - ecef[off0]);
    const y = ecef[off0 + 1] + alpha * (ecef[off1 + 1] - ecef[off0 + 1]);
    const z = ecef[off0 + 2] + alpha * (ecef[off1 + 2] - ecef[off0 + 2]);
    return Cartesian3.fromElements(x, y, z, result);
  }, false);
}

export function SatelliteLayer({
  id,
  name,
  tle,
  color,
  visible = true,
  selected = false,
  dayStartMs,
  orbitRenderMode,
  stepSec = 30,
}: Props) {
  const { viewer } = useCesium();
  const entityRef = useRef<CesiumEntity | null>(null);
  const perfLogger = useMemo(
    () =>
      new PerfLogger({
        enabled: import.meta.env.VITE_PERF_LOG === "true",
        onEntry: (entry) => perfMetricsStore.push(entry),
      }),
    []
  );

  const { orbitData, loading, error } = useOrbitData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    dayStartMs,
    stepSec,
    enabled: visible,
  });

  // CallbackPositionProperty: Float32Array を直接参照し、サンプルごとの Cartesian3 生成を回避
  const callbackPosition = useMemo(() => {
    if (!orbitData) return null;
    return perfLogger.measure(`callback-position-build:${id}`, () =>
      buildCallbackPosition(orbitData)
    );
  }, [orbitData, perfLogger, id]);

  const orbitPositions = useMemo(() => {
    if (!orbitData) return [];
    const { ecef } = orbitData;
    const positions: Cartesian3[] = [];
    for (let i = 0; i < ecef.length; i += 3) {
      positions.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
    }
    return positions;
  }, [orbitData]);

  // カメラ追尾: selected=true のときこの衛星を trackedEntity に設定
  useEffect(() => {
    if (!viewer) return;
    if (selected && entityRef.current) {
      viewer.trackedEntity = entityRef.current;
    } else if (!selected && viewer.trackedEntity === entityRef.current) {
      viewer.trackedEntity = undefined;
    }
    return () => {
      // アンマウント時（visible=false で Entity が消える際）にも追尾を解除
      if (viewer.trackedEntity === entityRef.current) {
        viewer.trackedEntity = undefined;
      }
    };
  }, [viewer, selected]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  if (loading || error || !orbitData || !callbackPosition || !visible) return null;

  return (
    <>
      {/* 軌道ライン */}
      <Entity
        polyline={{
          positions: orbitPositions,
          width: 2,
          material: cesiumColor.withAlpha(0.7),
          arcType: toCesiumArcType(orbitRenderMode),
          clampToGround: false,
        }}
      />

      {/* 衛星動点 */}
      <Entity
        name={name}
        position={callbackPosition}
        point={{
          pixelSize: selected ? 12 : 8,
          color: cesiumColor,
          outlineColor: selected ? Color.WHITE : Color.WHITE.withAlpha(0.6),
          outlineWidth: selected ? 2 : 1,
        }}
        label={{
          text: name,
          font: "11px monospace",
          fillColor: cesiumColor,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          pixelOffset: new Cartesian2(12, 0),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 20000000),
        }}
        ref={(ref) => {
          entityRef.current = ref?.cesiumElement ?? null;
        }}
      />
    </>
  );
}
