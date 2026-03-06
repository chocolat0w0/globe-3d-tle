import { describe, it, expect } from "vitest";
import { pointInPolygon } from "../point-in-polygon";

// 正方形ポリゴン: (0,0) → (10,0) → (10,10) → (0,10)
const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("pointInPolygon", () => {
  it("ポリゴン中央の点は内部と判定される", () => {
    expect(pointInPolygon([5, 5], square)).toBe(true);
  });

  it("ポリゴン外の点は外部と判定される", () => {
    expect(pointInPolygon([15, 5], square)).toBe(false);
    expect(pointInPolygon([-1, 5], square)).toBe(false);
    expect(pointInPolygon([5, -1], square)).toBe(false);
    expect(pointInPolygon([5, 11], square)).toBe(false);
  });

  it("辺の近傍の内部の点は内部と判定される", () => {
    expect(pointInPolygon([0.001, 5], square)).toBe(true);
    expect(pointInPolygon([9.999, 5], square)).toBe(true);
  });

  it("頂点数が3未満の場合は常にfalse", () => {
    expect(pointInPolygon([0, 0], [[0, 0], [1, 1]])).toBe(false);
    expect(pointInPolygon([0, 0], [[0, 0]])).toBe(false);
    expect(pointInPolygon([0, 0], [])).toBe(false);
  });

  it("三角形ポリゴンで正しく判定できる", () => {
    const triangle: [number, number][] = [
      [0, 0],
      [10, 0],
      [5, 10],
    ];
    expect(pointInPolygon([5, 3], triangle)).toBe(true);
    expect(pointInPolygon([0, 10], triangle)).toBe(false);
    expect(pointInPolygon([9, 8], triangle)).toBe(false);
  });

  it("L字型の凹ポリゴンでくぼみ内の点を外部と判定する", () => {
    // L字型: (0,0) → (10,0) → (10,5) → (5,5) → (5,10) → (0,10)
    const lShape: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 5],
      [5, 5],
      [5, 10],
      [0, 10],
    ];
    // L字の内部
    expect(pointInPolygon([3, 3], lShape)).toBe(true);
    expect(pointInPolygon([3, 8], lShape)).toBe(true);
    expect(pointInPolygon([8, 3], lShape)).toBe(true);
    // L字のくぼみ（右上）→ 外部
    expect(pointInPolygon([8, 8], lShape)).toBe(false);
  });

  it("負の座標でも正しく判定できる", () => {
    const negativeSquare: [number, number][] = [
      [-10, -10],
      [0, -10],
      [0, 0],
      [-10, 0],
    ];
    expect(pointInPolygon([-5, -5], negativeSquare)).toBe(true);
    expect(pointInPolygon([5, 5], negativeSquare)).toBe(false);
  });

  it("経度 180° 付近のポリゴンで正しく判定できる", () => {
    // 日付変更線付近（分割済みの片側）
    const nearDateline: [number, number][] = [
      [170, -10],
      [180, -10],
      [180, 10],
      [170, 10],
    ];
    expect(pointInPolygon([175, 0], nearDateline)).toBe(true);
    expect(pointInPolygon([165, 0], nearDateline)).toBe(false);
  });
});
