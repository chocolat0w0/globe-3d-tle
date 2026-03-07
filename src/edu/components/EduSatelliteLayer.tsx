import { useMemo } from "react";
import {
  ArcType,
  CallbackPositionProperty,
  Cartesian2,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  JulianDate,
} from "cesium";
import { Entity } from "resium";
import { useOrbitData } from "../../hooks/useOrbitData";
import { bisectLeft } from "../../lib/footprint/footprint-interpolator";
import type { OrbitData } from "../../types/orbit";
import type { TLEData } from "../../types/satellite";
import { getEduSatelliteEntityId } from "./edu-entity-id";

interface EduSatelliteLayerProps {
  id: string;
  displayName: string;
  tle: TLEData;
  color: string;
  selected: boolean;
  dayStartMs: number;
  stepSec?: number;
  /** When false, the orbit line and satellite dot are hidden entirely. Default: true. */
  visible?: boolean;
}

function buildCallbackPosition(data: OrbitData): CallbackPositionProperty {
  return new CallbackPositionProperty((julianDate: JulianDate | undefined, result?: Cartesian3) => {
    if (!julianDate) return undefined;
    const targetMs = JulianDate.toDate(julianDate).getTime();
    const { timesMs, ecef } = data;
    const n = timesMs.length;
    if (n === 0) return undefined;

    const i = bisectLeft(timesMs, targetMs);

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

export function EduSatelliteLayer({
  id,
  displayName,
  tle,
  color,
  selected,
  dayStartMs,
  stepSec = 30,
  visible = true,
}: EduSatelliteLayerProps) {
  const { orbitData, error } = useOrbitData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    dayStartMs,
    stepSec,
    enabled: true,
  });

  const callbackPosition = useMemo(
    () => (orbitData ? buildCallbackPosition(orbitData) : null),
    [orbitData],
  );

  const orbitPositions = useMemo(() => {
    if (!orbitData) return [];
    const { ecef } = orbitData;
    const positions: Cartesian3[] = [];
    for (let i = 0; i < ecef.length; i += 3) {
      positions.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
    }
    return positions;
  }, [orbitData]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  if (error || !orbitData || !callbackPosition || !visible) return null;

  return (
    <>
      <Entity
        polyline={{
          positions: orbitPositions,
          width: 2,
          material: cesiumColor.withAlpha(selected ? 0.95 : 0.72),
          arcType: ArcType.NONE,
          clampToGround: false,
        }}
      />
      <Entity
        id={getEduSatelliteEntityId(id)}
        name={displayName}
        position={callbackPosition}
        point={{
          pixelSize: selected ? 18 : 16,
          color: cesiumColor,
          outlineColor: Color.WHITE,
          outlineWidth: selected ? 3 : 2,
        }}
        label={{
          text: displayName,
          font: "700 14px 'M PLUS Rounded 1c'",
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK.withAlpha(0.85),
          outlineWidth: 3,
          pixelOffset: new Cartesian2(14, -4),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 22000000),
        }}
      />
    </>
  );
}
