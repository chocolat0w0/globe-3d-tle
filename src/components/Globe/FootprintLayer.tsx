import { useMemo, useState, useEffect } from "react";
import { Entity, useCesium } from "resium";
import { Cartesian3, Color, JulianDate, PolygonHierarchy } from "cesium";
import { useFootprintData } from "../../hooks/useFootprintData";
import type { FootprintParams } from "../../lib/tle/footprint";
import type { TLEData } from "../../types/satellite";
import type { FootprintData } from "../../types/orbit";
import { PerfLogger } from "../../lib/perf/perf-logger";
import { perfMetricsStore } from "../../lib/perf/perf-metrics-store";

interface Props {
  id: string;
  tle: TLEData;
  color: string;
  visible: boolean;
  showFootprint: boolean;
  dayStartMs: number;
  footprintParams?: FootprintParams;
  stepSec?: number;
}

const DEFAULT_FOOTPRINT_PARAMS: FootprintParams = {
  fov: [30, 30],
  offnadir: 0,
};

/**
 * timesMs を二分探索して targetMs に最も近いインデックスを返す
 */
function findClosestIndex(timesMs: Float64Array, targetMs: number): number {
  if (timesMs.length === 0) return -1;
  let lo = 0;
  let hi = timesMs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timesMs[mid] < targetMs) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(timesMs[lo - 1] - targetMs) < Math.abs(timesMs[lo] - targetMs)) {
    return lo - 1;
  }
  return lo;
}

/**
 * timeSizes の累積和（各タイムステップの開始ポリゴンインデックス）を計算する
 */
function computeTimePolyStarts(timeSizes: Int32Array): Int32Array {
  const starts = new Int32Array(timeSizes.length);
  let acc = 0;
  for (let i = 0; i < timeSizes.length; i++) {
    starts[i] = acc;
    acc += timeSizes[i];
  }
  return starts;
}

/**
 * フットプリントデータから指定タイムステップのポリゴン座標列を取り出す
 */
function extractPolygons(data: FootprintData, timePolyStarts: Int32Array, timeIdx: number): Cartesian3[][] {
  const polyStart = timePolyStarts[timeIdx];
  const polyCount = data.timeSizes[timeIdx];
  const result: Cartesian3[][] = [];

  for (let j = polyStart; j < polyStart + polyCount; j++) {
    const offset = data.offsets[j];
    const count = data.counts[j];
    const positions: Cartesian3[] = [];
    for (let k = 0; k < count; k++) {
      const lon = data.rings[(offset + k) * 2];
      const lat = data.rings[(offset + k) * 2 + 1];
      positions.push(Cartesian3.fromDegrees(lon, lat));
    }
    if (positions.length >= 3) {
      result.push(positions);
    }
  }
  return result;
}

export function FootprintLayer({
  id,
  tle,
  color,
  visible,
  showFootprint,
  dayStartMs,
  footprintParams = DEFAULT_FOOTPRINT_PARAMS,
  stepSec = 30,
}: Props) {
  const { viewer } = useCesium();
  const [currentMs, setCurrentMs] = useState(() => Date.now());
  const perfLogger = useMemo(
    () =>
      new PerfLogger({
        enabled: import.meta.env.VITE_PERF_LOG === "true",
        onEntry: (entry) => perfMetricsStore.push(entry),
      }),
    []
  );

  const { footprintData } = useFootprintData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    footprintParams,
    stepSec,
    dayStartMs,
    enabled: visible && showFootprint,
  });

  // Cesium Clock に追従してフットプリントを更新する（半ステップごとに更新）
  useEffect(() => {
    if (!viewer) return;
    const threshold = stepSec * 500; // 半ステップ（ms）
    const remove = viewer.scene.postRender.addEventListener(() => {
      const ms = JulianDate.toDate(viewer.clock.currentTime).getTime();
      setCurrentMs((prev) => (Math.abs(prev - ms) >= threshold ? ms : prev));
    });
    return () => remove();
  }, [viewer, stepSec]);

  const timePolyStarts = useMemo(
    () => (footprintData ? computeTimePolyStarts(footprintData.timeSizes) : null),
    [footprintData]
  );

  const polygons = useMemo(() => {
    if (!footprintData || !timePolyStarts) return [];
    return perfLogger.measure(`footprint-update:${id}`, () => {
      const timeIdx = findClosestIndex(footprintData.timesMs, currentMs);
      if (timeIdx < 0) return [];
      return extractPolygons(footprintData, timePolyStarts, timeIdx);
    });
  }, [footprintData, timePolyStarts, currentMs, perfLogger, id]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  if (!visible || !showFootprint || polygons.length === 0) return null;

  return (
    <>
      {polygons.map((positions, j) => (
        <Entity
          key={`${id}-fp-${j}`}
          polygon={{
            hierarchy: new PolygonHierarchy(positions),
            material: cesiumColor.withAlpha(0.25),
            outline: true,
            outlineColor: cesiumColor.withAlpha(0.8),
            outlineWidth: 1,
            height: 0,
          }}
        />
      ))}
    </>
  );
}
