import { useMemo, useEffect, useRef } from "react";
import { Entity, useCesium } from "resium";
import {
  SampledPositionProperty,
  JulianDate,
  Cartesian3,
  Cartesian2,
  Color,
  DistanceDisplayCondition,
  type Entity as CesiumEntity,
} from "cesium";
import { useOrbitData } from "../../hooks/useOrbitData";
import type { TLEData } from "../../types/satellite";
import type { OrbitRenderMode } from "../../types/orbit";
import { toCesiumArcType } from "./orbit-render-mode";

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
}: Props) {
  const { viewer } = useCesium();
  const entityRef = useRef<CesiumEntity | null>(null);

  const { orbitData, loading, error } = useOrbitData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    dayStartMs,
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

  if (loading || error || !orbitData || !sampledPosition || !visible) return null;

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
        ref={(ref) => {
          entityRef.current = ref?.cesiumElement ?? null;
        }}
      />
    </>
  );
}
