import { useMemo, useEffect } from "react";
import { Entity, useCesium } from "resium";
import {
  SampledPositionProperty,
  JulianDate,
  Cartesian3,
  Cartesian2,
  Color,
  ClockRange,
  DistanceDisplayCondition,
} from "cesium";
import { computeOrbit } from "../../lib/tle/orbit";
import type { TLEData } from "../../types/satellite";

interface Props {
  id: string;
  name: string;
  tle: TLEData;
  color: string;
}

/** 1日窓の開始時刻（UTC 00:00）を返す */
function getDayStartMs(now: number): number {
  return now - (now % 86400000);
}

export function SatelliteLayer({ id, name, tle, color }: Props) {
  const { viewer } = useCesium();

  // 1日分の軌道データを計算（step=30秒）
  const orbitData = useMemo(() => {
    const dayStart = getDayStartMs(Date.now());
    return computeOrbit(tle.line1, tle.line2, dayStart, 86400000, 30);
  }, [tle]);

  // SampledPositionProperty に各時刻の位置を登録
  const sampledPosition = useMemo(() => {
    const sp = new SampledPositionProperty();
    const { timesMs, ecef } = orbitData;
    for (let i = 0; i < timesMs.length; i++) {
      const julianDate = JulianDate.fromDate(new Date(timesMs[i]));
      const pos = new Cartesian3(ecef[i * 3], ecef[i * 3 + 1], ecef[i * 3 + 2]);
      sp.addSample(julianDate, pos);
    }
    return sp;
  }, [orbitData]);

  // 軌道ライン用の座標配列
  const orbitPositions = useMemo(() => {
    const { ecef } = orbitData;
    const positions: Cartesian3[] = [];
    for (let i = 0; i < ecef.length; i += 3) {
      positions.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
    }
    return positions;
  }, [orbitData]);

  // Cesium Clock を 1日窓に合わせて設定
  useEffect(() => {
    if (!viewer) return;
    const { timesMs } = orbitData;
    if (timesMs.length === 0) return;

    const start = JulianDate.fromDate(new Date(timesMs[0]));
    const stop = JulianDate.fromDate(new Date(timesMs[timesMs.length - 1]));

    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = JulianDate.fromDate(new Date());
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60; // 60倍速再生
    viewer.clock.shouldAnimate = true;
  }, [viewer, orbitData]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  return (
    <>
      {/* 軌道ライン */}
      <Entity
        key={`orbit-${id}`}
        polyline={{
          positions: orbitPositions,
          width: 2,
          material: cesiumColor,
          clampToGround: false,
        }}
      />

      {/* 衛星動点 */}
      <Entity
        key={`sat-${id}`}
        name={name}
        position={sampledPosition}
        point={{
          pixelSize: 8,
          color: cesiumColor,
          outlineColor: Color.WHITE,
          outlineWidth: 1,
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
      />
    </>
  );
}
