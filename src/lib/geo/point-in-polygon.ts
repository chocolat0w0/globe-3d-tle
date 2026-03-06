/**
 * Ray-casting アルゴリズムによる点包含判定。
 *
 * 点 [lon, lat] がポリゴン（[lon, lat][] の頂点列）の内部にあるかを判定する。
 * ポリゴンは開リング（最初と最後の頂点が異なる）でも閉リング（同一）でも動作する。
 *
 * @param point  判定対象の点 [lon, lat] (degrees)
 * @param polygon  ポリゴン頂点列 [lon, lat][] (degrees)
 * @returns 内部にあれば true
 */
export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [px, py] = point;
  const n = polygon.length;
  if (n < 3) return false;

  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    // 水平レイ（+x方向）と辺 (j→i) の交差判定
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
