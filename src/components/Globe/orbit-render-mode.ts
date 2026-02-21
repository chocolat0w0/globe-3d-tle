import { ArcType } from "cesium";
import type { OrbitRenderMode } from "../../types/orbit";

export function toCesiumArcType(mode: OrbitRenderMode): ArcType {
  return mode === "cartesian" ? ArcType.NONE : ArcType.GEODESIC;
}
