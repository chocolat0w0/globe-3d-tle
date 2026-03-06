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
import type { OrbitData } from "../../types/orbit";
import { interpolateEcefAtMs } from "../../lib/edu/custom-orbit";
import { getEduSatelliteEntityId } from "./edu-entity-id";

interface EduCustomSatelliteLayerProps {
  id: string;
  displayName: string;
  orbitData: OrbitData;
  color: string;
  selected: boolean;
}

function buildCallbackPosition(data: OrbitData): CallbackPositionProperty {
  return new CallbackPositionProperty((julianDate: JulianDate | undefined, result?: Cartesian3) => {
    if (!julianDate) return undefined;
    const targetMs = JulianDate.toDate(julianDate).getTime();
    const point = interpolateEcefAtMs(data, targetMs);
    if (!point) return undefined;
    return Cartesian3.fromElements(point.x, point.y, point.z, result);
  }, false);
}

export function EduCustomSatelliteLayer({
  id,
  displayName,
  orbitData,
  color,
  selected,
}: EduCustomSatelliteLayerProps) {
  const callbackPosition = useMemo(() => buildCallbackPosition(orbitData), [orbitData]);

  const orbitPositions = useMemo(() => {
    const { ecef } = orbitData;
    const positions: Cartesian3[] = [];
    for (let i = 0; i < ecef.length; i += 3) {
      positions.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
    }
    return positions;
  }, [orbitData]);

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  return (
    <>
      <Entity
        polyline={{
          positions: orbitPositions,
          width: 2.6,
          material: cesiumColor.withAlpha(selected ? 0.98 : 0.78),
          arcType: ArcType.NONE,
          clampToGround: false,
        }}
      />
      <Entity
        id={getEduSatelliteEntityId(id)}
        name={displayName}
        position={callbackPosition}
        point={{
          pixelSize: selected ? 20 : 18,
          color: cesiumColor,
          outlineColor: Color.WHITE,
          outlineWidth: selected ? 3 : 2,
        }}
        label={{
          text: displayName,
          font: "800 14px 'M PLUS Rounded 1c'",
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
