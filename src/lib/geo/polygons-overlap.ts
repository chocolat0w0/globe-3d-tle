import { pointInPolygon } from "./point-in-polygon";

/**
 * 2つの線分 (p1→p2) と (p3→p4) が交差するかを判定する。
 * 端点が相手の線分上にある場合も交差として扱う。
 */
export function segmentsIntersect(
  p1: [number, number],
  p2: [number, number],
  p3: [number, number],
  p4: [number, number],
): boolean {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // 共線チェック（端点が相手の線分上にある場合）
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

/**
 * 2つのポリゴンが重なる（交差または包含）かを判定する。
 *
 * 3段階チェック:
 * 1. polyA の頂点が polyB 内にあるか
 * 2. polyB の頂点が polyA 内にあるか
 * 3. 辺同士が交差するか
 *
 * @param polyA  ポリゴンA [lon, lat][] (degrees)
 * @param polyB  ポリゴンB [lon, lat][] (degrees)
 * @returns 重なりがあれば true
 */
export function polygonsOverlap(
  polyA: [number, number][],
  polyB: [number, number][],
): boolean {
  if (polyA.length < 3 || polyB.length < 3) return false;

  // 1. polyA の頂点が polyB 内にあるか
  for (const vertex of polyA) {
    if (pointInPolygon(vertex, polyB)) return true;
  }

  // 2. polyB の頂点が polyA 内にあるか
  for (const vertex of polyB) {
    if (pointInPolygon(vertex, polyA)) return true;
  }

  // 3. 辺同士の交差チェック
  const nA = polyA.length;
  const nB = polyB.length;
  for (let i = 0; i < nA; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % nA];
    for (let j = 0; j < nB; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % nB];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  return false;
}

// --- 内部ヘルパー ---

/** 外積 (b - a) × (c - a) のz成分 */
function cross(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

/** 点 p が線分 (a, b) のバウンディングボックス内にあるか */
function onSegment(a: [number, number], b: [number, number], p: [number, number]): boolean {
  return (
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}
