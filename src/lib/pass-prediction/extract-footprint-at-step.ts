import type { FootprintData } from "../../types/orbit";
import type { FootprintLookup } from "../footprint/footprint-interpolator";

/**
 * FootprintData のタイムステップ index における全ポリゴンの頂点を抽出する。
 *
 * dateline 分割がある場合は複数ポリゴン（最大2つ）を返す。
 * 内部的には FootprintLookup の timePolyStarts を使って O(1) でポリゴン位置を特定する。
 *
 * @param data    フットプリントデータ
 * @param lookup  buildFootprintLookup() で構築済みのルックアップ
 * @param stepIndex  タイムステップのインデックス (0-based)
 * @returns ポリゴン配列。各ポリゴンは [lon, lat][] の頂点列。頂点数 < 3 のポリゴンはスキップ。
 */
export function extractFootprintPolygonsAtStep(
  data: FootprintData,
  lookup: FootprintLookup,
  stepIndex: number,
): [number, number][][] {
  const polyCount = data.timeSizes[stepIndex];
  if (polyCount === 0) return [];

  const startPoly = lookup.timePolyStarts[stepIndex];
  const polygons: [number, number][][] = [];

  for (let p = 0; p < polyCount; p++) {
    const absIdx = startPoly + p;
    const offset = data.offsets[absIdx];
    const count = data.counts[absIdx];
    if (count < 3) continue;

    const vertices: [number, number][] = [];
    for (let k = 0; k < count; k++) {
      vertices.push([
        data.rings[(offset + k) * 2],
        data.rings[(offset + k) * 2 + 1],
      ]);
    }
    polygons.push(vertices);
  }

  return polygons;
}
