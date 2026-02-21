import { useMemo } from "react";
import { Entity } from "resium";
import { Cartesian3, Color, PolygonHierarchy } from "cesium";
import { useSwathData } from "../../hooks/useSwathData";
import type { SwathParams } from "../../lib/tle/swath";
import type { TLEData } from "../../types/satellite";
import type { SwathData } from "../../types/orbit";

interface Props {
  id: string;
  tle: TLEData;
  color: string;
  visible: boolean;
  showSwath: boolean;
  dayStartMs: number;
  swathParams?: SwathParams;
}

const DEFAULT_SWATH_PARAMS: SwathParams = {
  roll: 30,
  split: 360,
};

/**
 * SwathData から Cesium 用のポリゴン座標列を取り出す
 */
function extractPolygons(data: SwathData): Cartesian3[][] {
  const result: Cartesian3[][] = [];
  for (let j = 0; j < data.offsets.length; j++) {
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

export function SwathLayer({
  id,
  tle,
  color,
  visible,
  showSwath,
  dayStartMs,
  swathParams = DEFAULT_SWATH_PARAMS,
}: Props) {
  const { swathData } = useSwathData({
    satelliteId: id,
    tle1: tle.line1,
    tle2: tle.line2,
    swathParams,
    dayStartMs,
  });

  const polygons = useMemo(
    () => (swathData ? extractPolygons(swathData) : []),
    [swathData]
  );

  const cesiumColor = useMemo(() => Color.fromCssColorString(color), [color]);

  if (!visible || !showSwath || polygons.length === 0) return null;

  return (
    <>
      {polygons.map((positions, j) => (
        <Entity
          key={`${id}-sw-${j}`}
          polygon={{
            hierarchy: new PolygonHierarchy(positions),
            material: cesiumColor.withAlpha(0.12),
            outline: true,
            outlineColor: cesiumColor.withAlpha(0.5),
            outlineWidth: 1,
            height: 0,
          }}
        />
      ))}
    </>
  );
}
