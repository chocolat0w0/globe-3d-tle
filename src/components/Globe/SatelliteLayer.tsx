import { useMemo, useEffect, useRef } from "react";
import { Entity, useCesium } from "resium";
import {
  SampledPositionProperty,
  JulianDate,
  Cartesian3,
  Cartesian2,
  Color,
  ClockRange,
  DistanceDisplayCondition,
  type Entity as CesiumEntity,
} from "cesium";
import { useOrbitData } from "../../hooks/useOrbitData";
import type { TLEData } from "../../types/satellite";

interface Props {
  id: string;
  name: string;
  tle: TLEData;
  color: string;
  visible?: boolean;
  selected?: boolean;
  /** true の場合、この衛星のデータで Cesium Clock を初期設定する */
  initializeClock?: boolean;
}

export function SatelliteLayer({
  id,
  name,
  tle,
  color,
  visible = true,
  selected = false,
  initializeClock = false,
}: Props) {
  const { viewer } = useCesium();
  const entityRef = useRef<CesiumEntity | null>(null);

  const { orbitData, loading, error } = useOrbitData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
  });

  const sampledPosition = useMemo(() => {
    if (!orbitData) return null;
    const sp = new SampledPositionProperty();
    const { timesMs, ecef } = orbitData;
    for (let i = 0; i < timesMs.length; i++) {
      const julianDate = JulianDate.fromDate(new Date(timesMs[i]));
      const pos = new Cartesian3(ecef[i * 3], ecef[i * 3 + 1], ecef[i * 3 + 2]);
      sp.addSample(julianDate, pos);
    }
    return sp;
  }, [orbitData]);

  const orbitPositions = useMemo(() => {
    if (!orbitData) return [];
    const { ecef } = orbitData;
    const positions: Cartesian3[] = [];
    for (let i = 0; i < ecef.length; i += 3) {
      positions.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
    }
    return positions;
  }, [orbitData]);

  // Cesium Clock を1日窓に合わせて設定
  // initializeClock=true の衛星が起動時に設定、selected になった衛星が追尾時に設定
  useEffect(() => {
    if (!viewer || !orbitData) return;
    if (!initializeClock && !selected) return;
    const { timesMs } = orbitData;
    if (timesMs.length === 0) return;

    const start = JulianDate.fromDate(new Date(timesMs[0]));
    const stop = JulianDate.fromDate(new Date(timesMs[timesMs.length - 1]));

    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = JulianDate.fromDate(new Date());
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60;
    viewer.clock.shouldAnimate = true;
  }, [viewer, orbitData, initializeClock, selected]);

  // カメラ追尾: selected=true のときこの衛星を trackedEntity に設定
  useEffect(() => {
    if (!viewer) return;
    if (selected && entityRef.current) {
      viewer.trackedEntity = entityRef.current;
    } else if (!selected && viewer.trackedEntity === entityRef.current) {
      viewer.trackedEntity = undefined;
    }
  }, [viewer, selected]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  if (loading || error || !orbitData || !sampledPosition || !visible) return null;

  return (
    <>
      {/* 軌道ライン */}
      <Entity
        polyline={{
          positions: orbitPositions,
          width: 2,
          material: cesiumColor.withAlpha(0.7),
          clampToGround: false,
        }}
      />

      {/* 衛星動点 */}
      <Entity
        name={name}
        position={sampledPosition}
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
        ref={(entity) => {
          entityRef.current = entity ?? null;
        }}
      />
    </>
  );
}
