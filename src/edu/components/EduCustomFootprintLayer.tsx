import { useMemo } from "react";
import {
  CallbackProperty,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  JulianDate,
  PolygonHierarchy,
} from "cesium";
import { Entity } from "resium";
import type { OrbitData } from "../../types/orbit";
import {
  buildGroundCircle,
  ecefToGeodeticApprox,
  estimateGroundRadiusKm,
  interpolateEcefAtMs,
} from "../../lib/edu/custom-orbit";

const PULSE_BASE_ALPHA = 0.38;
const PULSE_DELTA = 0.1;
const PULSE_FREQUENCY = 2.2;

interface EduCustomFootprintLayerProps {
  orbitData: OrbitData;
  color: string;
  altitudeKm: number;
  footprintFovDeg: number;
}

export function EduCustomFootprintLayer({
  orbitData,
  color,
  altitudeKm,
  footprintFovDeg,
}: EduCustomFootprintLayerProps) {
  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  const hierarchyCallback = useMemo(
    () =>
      new CallbackProperty((julianDate: JulianDate | undefined): PolygonHierarchy | undefined => {
        if (!julianDate) return undefined;
        const currentMs = JulianDate.toDate(julianDate).getTime();
        const ecef = interpolateEcefAtMs(orbitData, currentMs);
        if (!ecef) return undefined;

        const geodetic = ecefToGeodeticApprox(ecef);
        const groundRadiusKm = estimateGroundRadiusKm(altitudeKm, footprintFovDeg);
        const ring = buildGroundCircle(geodetic.lonDeg, geodetic.latDeg, groundRadiusKm, 56);
        if (ring.length < 3) return undefined;

        const positions = ring.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat));
        return new PolygonHierarchy(positions);
      }, false),
    [altitudeKm, footprintFovDeg, orbitData],
  );

  const material = useMemo(
    () =>
      new ColorMaterialProperty(
        new CallbackProperty((julianDate: JulianDate | undefined) => {
          const baseSeconds = julianDate ? JulianDate.toDate(julianDate).getTime() / 1000 : 0;
          const alpha = PULSE_BASE_ALPHA + Math.sin(baseSeconds * PULSE_FREQUENCY) * PULSE_DELTA;
          return cesiumColor.withAlpha(Math.max(0.2, Math.min(0.54, alpha)));
        }, false),
      ),
    [cesiumColor],
  );

  return (
    <Entity
      polygon={{
        hierarchy: hierarchyCallback,
        material,
        outline: true,
        outlineColor: new ConstantProperty(cesiumColor.withAlpha(0.9)),
        outlineWidth: new ConstantProperty(2),
        height: new ConstantProperty(0),
      }}
    />
  );
}
