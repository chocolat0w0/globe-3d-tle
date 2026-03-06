import { useEffect, useMemo, useRef } from "react";
import {
  CallbackProperty,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  JulianDate,
  PolygonHierarchy,
  type Entity as CesiumEntity,
} from "cesium";
import { useCesium } from "resium";
import { useFootprintData } from "../../hooks/useFootprintData";
import {
  buildFootprintLookup,
  getPolygonCountAtTime,
  interpolatePolygonVertices,
  type FootprintLookup,
} from "../../lib/footprint/footprint-interpolator";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";

const PULSE_BASE_ALPHA = 0.4;
const PULSE_DELTA = 0.08;
const PULSE_FREQUENCY = 2.2;

interface EduFootprintLayerProps {
  satelliteId: string;
  tle1: string;
  tle2: string;
  color: string;
  dayStartMs: number;
  offnadirRanges: OffnadirRange[];
  stepSec?: number;
}

export function EduFootprintLayer({
  satelliteId,
  tle1,
  tle2,
  color,
  dayStartMs,
  offnadirRanges,
  stepSec = 30,
}: EduFootprintLayerProps) {
  const { viewer } = useCesium();
  const lookupRef = useRef<FootprintLookup | null>(null);
  const colorRef = useRef(Color.fromCssColorString(color));
  const entitiesRef = useRef<CesiumEntity[]>([]);

  const footprintParams = useMemo(
    () => ({ fov: [10, 10] as [number, number], offnadirRanges }),
    [offnadirRanges],
  );

  const { footprintData } = useFootprintData({
    satelliteId,
    tle1,
    tle2,
    footprintParams,
    dayStartMs,
    stepSec,
    enabled: true,
  });

  useEffect(() => {
    if (!footprintData) {
      lookupRef.current = null;
      return;
    }
    lookupRef.current = buildFootprintLookup(footprintData);
  }, [footprintData]);

  useEffect(() => {
    if (!viewer) return;

    const makeHierarchyCallback = (polyIndex: number) =>
      new CallbackProperty((julianDate: JulianDate | undefined): PolygonHierarchy | undefined => {
        if (!lookupRef.current || !julianDate) return undefined;
        const currentMs = JulianDate.toDate(julianDate).getTime();

        if (polyIndex === 1 && getPolygonCountAtTime(lookupRef.current, currentMs) < 2) {
          return undefined;
        }

        const lonsLats = interpolatePolygonVertices(lookupRef.current, currentMs, polyIndex);
        if (!lonsLats || lonsLats.length < 3) return undefined;

        const positions = lonsLats.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat));
        return new PolygonHierarchy(positions);
      }, false);

    const makePulseMaterial = () =>
      new ColorMaterialProperty(
        new CallbackProperty((julianDate: JulianDate | undefined) => {
          const baseSeconds = julianDate ? JulianDate.toDate(julianDate).getTime() / 1000 : 0;
          const alpha = PULSE_BASE_ALPHA + Math.sin(baseSeconds * PULSE_FREQUENCY) * PULSE_DELTA;
          const clampedAlpha = Math.min(0.52, Math.max(0.24, alpha));
          return colorRef.current.withAlpha(clampedAlpha);
        }, false),
      );

    const c = colorRef.current;
    entitiesRef.current = [0, 1].map((polyIndex) =>
      viewer.entities.add({
        show: true,
        polygon: {
          hierarchy: makeHierarchyCallback(polyIndex),
          material: makePulseMaterial(),
          outline: true,
          outlineColor: new ConstantProperty(c.withAlpha(0.92)),
          outlineWidth: new ConstantProperty(2),
          height: new ConstantProperty(0),
        },
      }),
    );

    return () => {
      if (!viewer.isDestroyed()) {
        for (const entity of entitiesRef.current) {
          viewer.entities.remove(entity);
        }
      }
      entitiesRef.current = [];
    };
  }, [viewer]);

  useEffect(() => {
    const c = Color.fromCssColorString(color);
    colorRef.current = c;

    for (const entity of entitiesRef.current) {
      if (entity.polygon) {
        entity.polygon.material = new ColorMaterialProperty(
          new CallbackProperty((julianDate: JulianDate | undefined) => {
            const baseSeconds = julianDate ? JulianDate.toDate(julianDate).getTime() / 1000 : 0;
            const alpha = PULSE_BASE_ALPHA + Math.sin(baseSeconds * PULSE_FREQUENCY) * PULSE_DELTA;
            const clampedAlpha = Math.min(0.52, Math.max(0.24, alpha));
            return c.withAlpha(clampedAlpha);
          }, false),
        );
        entity.polygon.outlineColor = new ConstantProperty(c.withAlpha(0.92));
      }
    }
  }, [color]);

  return null;
}
