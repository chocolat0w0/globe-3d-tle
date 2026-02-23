import { useMemo, useEffect, useRef } from "react";
import { useCesium } from "resium";
import {
  CallbackProperty,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  JulianDate,
  PolygonHierarchy,
  Cartesian3,
  type Entity as CesiumEntity,
} from "cesium";
import { useFootprintData } from "../../hooks/useFootprintData";
import type { FootprintParams } from "../../lib/tle/footprint";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";
import type { TLEData } from "../../types/satellite";
import { PerfLogger } from "../../lib/perf/perf-logger";
import { perfMetricsStore } from "../../lib/perf/perf-metrics-store";
import {
  buildFootprintLookup,
  getPolygonCountAtTime,
  interpolatePolygonVertices,
  type FootprintLookup,
} from "../../lib/footprint/footprint-interpolator";

interface Props {
  id: string;
  tle: TLEData;
  color: string;
  visible: boolean;
  showFootprint: boolean;
  dayStartMs: number;
  offnadirRanges?: OffnadirRange[];
  footprintParams?: FootprintParams;
  stepSec?: number;
}

const DEFAULT_FOOTPRINT_PARAMS: FootprintParams = {
  fov: [30, 30],
  offnadirRanges: [[-30, 30]],
};

export function FootprintLayer({
  id,
  tle,
  color,
  visible,
  showFootprint,
  dayStartMs,
  offnadirRanges,
  footprintParams = DEFAULT_FOOTPRINT_PARAMS,
  stepSec = 30,
}: Props) {
  const { viewer } = useCesium();

  const perfLogger = useMemo(
    () =>
      new PerfLogger({
        enabled: import.meta.env.VITE_PERF_LOG === "true",
        onEntry: (entry) => perfMetricsStore.push(entry),
      }),
    [],
  );

  const resolvedFootprintParams = useMemo<FootprintParams>(() => {
    if (!offnadirRanges) return footprintParams;
    return {
      ...footprintParams,
      offnadirRanges,
    };
  }, [footprintParams, offnadirRanges]);

  const { footprintData } = useFootprintData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    footprintParams: resolvedFootprintParams,
    stepSec,
    dayStartMs,
    enabled: visible && showFootprint,
  });

  // フレームコールバックが参照するルックアップ（毎フレーム再計算不要）
  const lookupRef = useRef<FootprintLookup | null>(null);
  // 色変化をコールバックで参照するための ref
  const colorRef = useRef<Color>(Color.fromCssColorString(color));
  // 命令的に管理する Entity（[0]=primary, [1]=secondary）
  const entitiesRef = useRef<CesiumEntity[]>([]);

  // ─── Entity を viewer に対して1回生成する ──────────────────────────────
  useEffect(() => {
    if (!viewer) return;

    const makeHierarchyCallback = (polyIndex: number) =>
      new CallbackProperty((julianDate: JulianDate | undefined): PolygonHierarchy | undefined => {
        if (!lookupRef.current || !julianDate) return undefined;
        const currentMs = JulianDate.toDate(julianDate).getTime();

        // secondary Entity: dateline 分割がないタイムステップでは undefined を返して非表示に
        if (polyIndex === 1 && getPolygonCountAtTime(lookupRef.current, currentMs) < 2) {
          return undefined;
        }

        const lonsLats = interpolatePolygonVertices(lookupRef.current, currentMs, polyIndex);
        if (!lonsLats || lonsLats.length < 3) return undefined;

        const positions = lonsLats.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat));
        return new PolygonHierarchy(positions);
      }, false);

    const c = colorRef.current;
    const primaryEntity = viewer.entities.add({
      show: visible && showFootprint,
      polygon: {
        hierarchy: makeHierarchyCallback(0),
        material: new ColorMaterialProperty(c.withAlpha(0.25)),
        outline: true,
        outlineColor: new ConstantProperty(c.withAlpha(0.8)),
        outlineWidth: new ConstantProperty(1),
        height: new ConstantProperty(0),
      },
    });

    const secondaryEntity = viewer.entities.add({
      show: visible && showFootprint,
      polygon: {
        hierarchy: makeHierarchyCallback(1),
        material: new ColorMaterialProperty(c.withAlpha(0.25)),
        outline: true,
        outlineColor: new ConstantProperty(c.withAlpha(0.8)),
        outlineWidth: new ConstantProperty(1),
        height: new ConstantProperty(0),
      },
    });

    entitiesRef.current = [primaryEntity, secondaryEntity];

    return () => {
      viewer.entities.remove(primaryEntity);
      viewer.entities.remove(secondaryEntity);
      entitiesRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // ─── footprintData 変化時にルックアップを更新 ─────────────────────────
  useEffect(() => {
    if (!footprintData) {
      lookupRef.current = null;
      return;
    }
    perfLogger.measure(`footprint-update:${id}`, () => {
      lookupRef.current = buildFootprintLookup(footprintData);
    });
  }, [footprintData, id, perfLogger]);

  // ─── 表示状態の更新 ──────────────────────────────────────────────────
  useEffect(() => {
    for (const entity of entitiesRef.current) {
      entity.show = visible && showFootprint;
    }
  }, [visible, showFootprint]);

  // ─── 色の更新 ────────────────────────────────────────────────────────
  useEffect(() => {
    const c = Color.fromCssColorString(color);
    colorRef.current = c;
    for (const entity of entitiesRef.current) {
      if (entity.polygon) {
        entity.polygon.material = new ColorMaterialProperty(c.withAlpha(0.25));
        entity.polygon.outlineColor = new ConstantProperty(c.withAlpha(0.8));
      }
    }
  }, [color]);

  // Entity は命令的に管理するため JSX は不要
  return null;
}
