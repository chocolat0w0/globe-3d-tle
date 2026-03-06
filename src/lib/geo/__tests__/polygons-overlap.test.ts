import { describe, it, expect } from "vitest";
import { segmentsIntersect, polygonsOverlap } from "../polygons-overlap";

describe("segmentsIntersect", () => {
  it("交差する線分を検出する", () => {
    expect(segmentsIntersect([0, 0], [10, 10], [10, 0], [0, 10])).toBe(true);
  });

  it("交差しない線分を検出する", () => {
    expect(segmentsIntersect([0, 0], [5, 5], [6, 6], [10, 10])).toBe(false);
  });

  it("平行な線分は交差しない", () => {
    expect(segmentsIntersect([0, 0], [10, 0], [0, 1], [10, 1])).toBe(false);
  });

  it("T字型に接触する線分を交差と判定する", () => {
    expect(segmentsIntersect([0, 0], [10, 0], [5, -5], [5, 0])).toBe(true);
  });

  it("端点が重なる線分を交差と判定する", () => {
    expect(segmentsIntersect([0, 0], [5, 5], [5, 5], [10, 0])).toBe(true);
  });
});

describe("polygonsOverlap", () => {
  const squareA: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it("部分的に重なるポリゴンを検出する", () => {
    // squareA と右にずれた正方形
    const squareB: [number, number][] = [
      [5, 0],
      [15, 0],
      [15, 10],
      [5, 10],
    ];
    expect(polygonsOverlap(squareA, squareB)).toBe(true);
  });

  it("完全に離れたポリゴンは重ならない", () => {
    const farSquare: [number, number][] = [
      [20, 20],
      [30, 20],
      [30, 30],
      [20, 30],
    ];
    expect(polygonsOverlap(squareA, farSquare)).toBe(false);
  });

  it("ポリゴンAがBに完全に含まれる場合を検出する", () => {
    const smallSquare: [number, number][] = [
      [3, 3],
      [7, 3],
      [7, 7],
      [3, 7],
    ];
    expect(polygonsOverlap(squareA, smallSquare)).toBe(true);
    // 逆順でも動作
    expect(polygonsOverlap(smallSquare, squareA)).toBe(true);
  });

  it("辺だけが交差するポリゴンを検出する", () => {
    // squareA の右辺と交差するが、頂点はどちらにも含まれないケース
    // 細い菱形が squareA の右辺を横切る
    const diamond: [number, number][] = [
      [10, 5],   // squareA の辺上
      [12, 3],
      [14, 5],
      [12, 7],
    ];
    // 菱形の左端頂点(10,5)はsquareAの辺上にあるため、
    // ray-castingでは境界判定が曖昧 → 辺交差チェックで確実に検出
    expect(polygonsOverlap(squareA, diamond)).toBe(true);
  });

  it("頂点数が3未満の場合は常にfalse", () => {
    expect(polygonsOverlap(squareA, [[0, 0], [1, 1]])).toBe(false);
    expect(polygonsOverlap([[0, 0]], squareA)).toBe(false);
  });

  it("同一のポリゴンは重なる", () => {
    expect(polygonsOverlap(squareA, squareA)).toBe(true);
  });

  it("三角形同士の部分交差を検出する", () => {
    const triA: [number, number][] = [
      [0, 0],
      [10, 0],
      [5, 10],
    ];
    const triB: [number, number][] = [
      [5, 5],
      [15, 5],
      [10, 15],
    ];
    expect(polygonsOverlap(triA, triB)).toBe(true);
  });

  it("隣接するが重ならないポリゴン", () => {
    // 辺を共有（厳密に隣接）
    const adjacent: [number, number][] = [
      [10, 0],
      [20, 0],
      [20, 10],
      [10, 10],
    ];
    // 辺の共有は segmentsIntersect で検出される可能性があるが、
    // 面積的には重ならない（実用上は通過とみなして良い）
    const result = polygonsOverlap(squareA, adjacent);
    // 辺共有は交差として検出される（保守的判定）
    expect(result).toBe(true);
  });
});
