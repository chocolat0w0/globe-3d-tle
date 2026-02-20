import { Cartesian3 } from "cesium";
import type { ECEFPosition } from "../../types/orbit";

/**
 * ECEF座標（メートル）を Cesium.Cartesian3 に変換する
 */
export function ecefToCartesian3(pos: ECEFPosition): Cartesian3 {
  return new Cartesian3(pos.x, pos.y, pos.z);
}

/**
 * OrbitData の ECEF バッファから各点の Cartesian3 配列を生成する
 *
 * @param ecef Float32Array [x0,y0,z0, x1,y1,z1, ...]（メートル）
 */
export function ecefArrayToCartesian3Array(ecef: Float32Array): Cartesian3[] {
  const result: Cartesian3[] = [];
  for (let i = 0; i < ecef.length; i += 3) {
    result.push(new Cartesian3(ecef[i], ecef[i + 1], ecef[i + 2]));
  }
  return result;
}
