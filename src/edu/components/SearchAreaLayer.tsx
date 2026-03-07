import { useMemo } from "react";
import { Cartesian3, Color, ConstantProperty, PolygonHierarchy } from "cesium";
import { Entity } from "resium";
import { buildGroundCircle } from "../../lib/edu/custom-orbit";

interface SearchAreaLayerProps {
  lonDeg: number;
  latDeg: number;
  radiusKm: number;
  locationName: string;
}

const FILL_COLOR = Color.YELLOW.withAlpha(0.15);
const OUTLINE_COLOR = Color.YELLOW.withAlpha(0.8);

export function SearchAreaLayer({ lonDeg, latDeg, radiusKm, locationName }: SearchAreaLayerProps) {
  const hierarchy = useMemo(() => {
    const ring = buildGroundCircle(lonDeg, latDeg, radiusKm, 64);
    if (ring.length < 3) return null;
    const positions = ring.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat));
    return new PolygonHierarchy(positions);
  }, [lonDeg, latDeg, radiusKm]);

  const labelPosition = useMemo(
    () => Cartesian3.fromDegrees(lonDeg, latDeg),
    [lonDeg, latDeg],
  );

  if (!hierarchy) return null;

  return (
    <>
      <Entity
        polygon={{
          hierarchy: new ConstantProperty(hierarchy),
          material: new ConstantProperty(FILL_COLOR),
          outline: true,
          outlineColor: new ConstantProperty(OUTLINE_COLOR),
          outlineWidth: new ConstantProperty(2),
          height: new ConstantProperty(0),
        }}
      />
      <Entity
        position={labelPosition}
        label={{
          text: new ConstantProperty(locationName),
          font: new ConstantProperty("14px sans-serif"),
          fillColor: new ConstantProperty(Color.WHITE),
          outlineColor: new ConstantProperty(Color.BLACK),
          outlineWidth: new ConstantProperty(3),
          style: new ConstantProperty(2), // FILL_AND_OUTLINE
          pixelOffset: new ConstantProperty({ x: 0, y: -20 }),
          disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
        }}
      />
    </>
  );
}
