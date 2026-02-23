import { describe, expect, it } from "vitest";
import {
  bisectLeft,
  buildFootprintLookup,
  getPolygonCountAtTime,
  interpolatePolygonVertices,
  lerpLon,
} from "../footprint-interpolator";
import type { FootprintData } from "../../../types/orbit";

// ─── テストデータ構築ヘルパー ───────────────────────────────────────────────

/**
 * 各タイムステップに複数ポリゴンを持てるシンプルな FootprintData を構築する。
 *
 * @param timesMs タイムスタンプ配列
 * @param polygonGroups 各タイムステップのポリゴン配列（ポリゴンは [lon, lat][] の頂点列）
 */
function makeData(
  timesMs: number[],
  polygonGroups: Array<Array<[number, number][]>>,
): FootprintData {
  const timeSizes = new Int32Array(polygonGroups.map((g) => g.length));
  const allPolygons = polygonGroups.flat();

  const counts = new Int32Array(allPolygons.map((p) => p.length));

  // offsets: 累積和（座標ペア単位）
  const offsets = new Int32Array(allPolygons.length);
  let off = 0;
  for (let i = 0; i < allPolygons.length; i++) {
    offsets[i] = off;
    off += allPolygons[i].length;
  }

  // rings: 全頂点を lon, lat の順でフラット化
  const rings = new Float32Array(off * 2);
  let ri = 0;
  for (const poly of allPolygons) {
    for (const [lon, lat] of poly) {
      rings[ri++] = lon;
      rings[ri++] = lat;
    }
  }

  return { timesMs: new Float64Array(timesMs), rings, offsets, counts, timeSizes };
}

// 単純な三角形ポリゴン
const TRIANGLE_A: [number, number][] = [
  [0, 0],
  [2, 0],
  [1, 2],
];
const TRIANGLE_B: [number, number][] = [
  [10, 0],
  [12, 0],
  [11, 2],
];

// ─── bisectLeft ────────────────────────────────────────────────────────────

describe("bisectLeft", () => {
  it("空配列は 0 を返す", () => {
    expect(bisectLeft(new Float64Array([]), 100)).toBe(0);
  });

  it("先頭より小さい値は 0 を返す", () => {
    const t = new Float64Array([100, 200, 300]);
    expect(bisectLeft(t, 50)).toBe(0);
  });

  it("末尾より大きい値は length-1 を返す", () => {
    const t = new Float64Array([100, 200, 300]);
    expect(bisectLeft(t, 999)).toBe(2);
  });

  it("ちょうど一致する値のインデックスを返す", () => {
    const t = new Float64Array([100, 200, 300]);
    expect(bisectLeft(t, 200)).toBe(1);
  });

  it("中間値は直前のインデックスを返す", () => {
    const t = new Float64Array([0, 100, 200]);
    expect(bisectLeft(t, 50)).toBe(0);
    expect(bisectLeft(t, 150)).toBe(1);
  });

  it("要素が1つの場合は 0 を返す", () => {
    const t = new Float64Array([500]);
    expect(bisectLeft(t, 0)).toBe(0);
    expect(bisectLeft(t, 500)).toBe(0);
    expect(bisectLeft(t, 1000)).toBe(0);
  });
});

// ─── lerpLon ───────────────────────────────────────────────────────────────

describe("lerpLon", () => {
  it("通常の補間: 0° → 10°, alpha=0.5 → 5°", () => {
    expect(lerpLon(0, 10, 0.5)).toBeCloseTo(5);
  });

  it("alpha=0 は lon0 をそのまま返す", () => {
    expect(lerpLon(30, 90, 0)).toBeCloseTo(30);
  });

  it("alpha=1 は lon1 をそのまま返す", () => {
    expect(lerpLon(30, 90, 1)).toBeCloseTo(90);
  });

  it("antimeridian 跨ぎ: 170° → -170°, alpha=0.5 → 180° or -180°（等価）", () => {
    // 差は -340° → -20° に補正、170 + 0.5*(-20) = 160°
    // 実際のケース: 東に進んで dateline 跨ぎ
    const result = lerpLon(170, -170, 0.5);
    // 170 + 0.5 * ((-170 - 170) % 360 補正後の -20) = 170 + (-10) = 160
    // 補正: diff = -170 - 170 = -340 < -180 → diff = -340 + 360 = 20
    // result = 170 + 0.5 * 20 = 180 → 180 > 180 → 180 - 360 = -180
    expect(Math.abs(result)).toBeCloseTo(180);
  });

  it("antimeridian 跨ぎ（逆方向）: -170° → 170°, alpha=0.5 → ±180°", () => {
    const result = lerpLon(-170, 170, 0.5);
    expect(Math.abs(result)).toBeCloseTo(180);
  });

  it("通常の西方向補間: 20° → -20°, alpha=0.5 → 0°", () => {
    expect(lerpLon(20, -20, 0.5)).toBeCloseTo(0);
  });
});

// ─── interpolatePolygonVertices ────────────────────────────────────────────

describe("interpolatePolygonVertices", () => {
  describe("基本補間", () => {
    it("alpha=0（ちょうど t0）: t=0 のサンプルと一致する", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      const result = interpolatePolygonVertices(lookup, 0, 0);
      expect(result).not.toBeNull();
      expect(result![0]).toEqual([TRIANGLE_A[0][0], TRIANGLE_A[0][1]]);
      expect(result![1]).toEqual([TRIANGLE_A[1][0], TRIANGLE_A[1][1]]);
      expect(result![2]).toEqual([TRIANGLE_A[2][0], TRIANGLE_A[2][1]]);
    });

    it("alpha=1（ちょうど t1）: t=100 のサンプルと一致する", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      const result = interpolatePolygonVertices(lookup, 100, 0);
      // bisectLeft(t=100) = 1 = idx >= n-1 → 末尾クランプ → TRIANGLE_B
      expect(result).not.toBeNull();
      expect(result![0]).toEqual([TRIANGLE_B[0][0], TRIANGLE_B[0][1]]);
    });

    it("alpha=0.5（中間）: 各頂点が正しく補間される", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      const result = interpolatePolygonVertices(lookup, 50, 0);
      expect(result).not.toBeNull();
      // 頂点0: (0,0)→(10,0), alpha=0.5 → (5, 0)
      expect(result![0][0]).toBeCloseTo(5);
      expect(result![0][1]).toBeCloseTo(0);
      // 頂点1: (2,0)→(12,0), alpha=0.5 → (7, 0)
      expect(result![1][0]).toBeCloseTo(7);
      expect(result![1][1]).toBeCloseTo(0);
    });

    it("3タイムステップの中間ステップを補間する", () => {
      const polyC: [number, number][] = [
        [20, 0],
        [22, 0],
        [21, 2],
      ];
      const data = makeData([0, 100, 200], [[TRIANGLE_A], [TRIANGLE_B], [polyC]]);
      const lookup = buildFootprintLookup(data);
      // t=50: idx=0, alpha=0.5, A→B 補間
      const r0 = interpolatePolygonVertices(lookup, 50, 0);
      expect(r0![0][0]).toBeCloseTo(5);
      // t=150: idx=1, alpha=0.5, B→C 補間
      const r1 = interpolatePolygonVertices(lookup, 150, 0);
      expect(r1![0][0]).toBeCloseTo(15); // 10 + 0.5*(20-10)
    });
  });

  describe("末尾クランプ", () => {
    it("末尾サンプルより後の時刻: 最終サンプルの頂点を返す", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      const result = interpolatePolygonVertices(lookup, 9999, 0);
      expect(result).not.toBeNull();
      expect(result![0][0]).toBeCloseTo(TRIANGLE_B[0][0]);
    });
  });

  describe("データが空の場合", () => {
    it("timesMs が空のとき null を返す", () => {
      const data = makeData([], []);
      const lookup = buildFootprintLookup(data);
      expect(interpolatePolygonVertices(lookup, 50, 0)).toBeNull();
    });
  });

  describe("dateline 遷移（timeSizes 変化）", () => {
    it("1→2 に変わるステップではスナップする（t が t0 に近い場合 t0 へスナップ）", () => {
      // t=0: ポリゴン1つ, t=100: ポリゴン2つ
      const sec: [number, number][] = [
        [160, 5],
        [162, 5],
        [161, 7],
      ];
      const data = makeData(
        [0, 100],
        [[TRIANGLE_A], [TRIANGLE_B, sec]],
      );
      const lookup = buildFootprintLookup(data);

      // t=10: t0 (0ms) に近い → t=0 の単一ポリゴンにスナップ
      const result = interpolatePolygonVertices(lookup, 10, 0);
      expect(result).not.toBeNull();
      // t=0 の頂点 (TRIANGLE_A)
      expect(result![0][0]).toBeCloseTo(TRIANGLE_A[0][0]);
    });

    it("1→2 に変わるステップでスナップ（t が t1 に近い場合 t1 へスナップ）", () => {
      const sec: [number, number][] = [
        [160, 5],
        [162, 5],
        [161, 7],
      ];
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B, sec]]);
      const lookup = buildFootprintLookup(data);

      // t=90: t1 (100ms) に近い → t=100 の primary polygon にスナップ
      const result = interpolatePolygonVertices(lookup, 90, 0);
      expect(result).not.toBeNull();
      expect(result![0][0]).toBeCloseTo(TRIANGLE_B[0][0]);
    });

    it("dateline 遷移時に polyIndex=1 は null（スナップ先に secondary がない場合）", () => {
      const sec: [number, number][] = [
        [160, 5],
        [162, 5],
        [161, 7],
      ];
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B, sec]]);
      const lookup = buildFootprintLookup(data);

      // t=10: t0 にスナップ → t0 は polyCont=1 → polyIndex=1 は null
      const result = interpolatePolygonVertices(lookup, 10, 1);
      expect(result).toBeNull();
    });
  });

  describe("頂点数不一致", () => {
    const polyBig: [number, number][] = [
      [10, 0],
      [12, 0],
      [11, 2],
      [11, -1],
    ]; // 4頂点（TRIANGLE_B は3頂点）

    it("頂点数が異なるサンプル間ではスナップする", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [polyBig]]);
      const lookup = buildFootprintLookup(data);

      // t=50: 頂点数 3 ≠ 4 → スナップ
      // t0(0) に近くもなく t1(100) に近くもない → t0 にスナップ (50-0 < 100-50 は false、等しい → t0)
      const result = interpolatePolygonVertices(lookup, 50, 0);
      expect(result).not.toBeNull();
      // t=50 は t0(0)と t1(100)の差が等しいので: 50-0=50, 100-50=50 → 50 < 50 が false → t1 にスナップ
      expect(result!.length).toBe(4); // polyBig の頂点数
    });

    it("t が t0 に近い場合は t0 の頂点数を使用", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [polyBig]]);
      const lookup = buildFootprintLookup(data);

      const result = interpolatePolygonVertices(lookup, 10, 0);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(3); // TRIANGLE_A の頂点数
    });
  });

  describe("polyIndex 範囲外", () => {
    it("polyIndex=1 でポリゴンが1つしかないとき null を返す", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      expect(interpolatePolygonVertices(lookup, 50, 1)).toBeNull();
    });

    it("polyIndex=0 で通常ポリゴンが存在するとき非 null を返す", () => {
      const data = makeData([0, 100], [[TRIANGLE_A], [TRIANGLE_B]]);
      const lookup = buildFootprintLookup(data);
      expect(interpolatePolygonVertices(lookup, 50, 0)).not.toBeNull();
    });
  });

  describe("dateline 2ポリゴン補間", () => {
    it("両サンプルでポリゴンが2つある場合、polyIndex=1 も補間される", () => {
      const triA2: [number, number][] = [
        [170, 0],
        [172, 0],
        [171, 2],
      ];
      const triB2: [number, number][] = [
        [175, 0],
        [177, 0],
        [176, 2],
      ];
      const data = makeData(
        [0, 100],
        [[TRIANGLE_A, triA2], [TRIANGLE_B, triB2]],
      );
      const lookup = buildFootprintLookup(data);

      // polyIndex=0: A→B 補間
      const r0 = interpolatePolygonVertices(lookup, 50, 0);
      expect(r0).not.toBeNull();
      expect(r0![0][0]).toBeCloseTo(5);

      // polyIndex=1: triA2→triB2 補間
      const r1 = interpolatePolygonVertices(lookup, 50, 1);
      expect(r1).not.toBeNull();
      expect(r1![0][0]).toBeCloseTo(172.5); // 170 + 0.5*(175-170)
    });
  });
});

// ─── getPolygonCountAtTime ─────────────────────────────────────────────────

describe("getPolygonCountAtTime", () => {
  it("空データのとき 0 を返す", () => {
    const data = makeData([], []);
    expect(getPolygonCountAtTime(buildFootprintLookup(data), 0)).toBe(0);
  });

  it("dateline 分割あり: 該当ステップで 2 を返す", () => {
    const sec: [number, number][] = [
      [160, 5],
      [162, 5],
      [161, 7],
    ];
    const data = makeData([0, 100, 200], [[TRIANGLE_A], [TRIANGLE_B, sec], [TRIANGLE_A]]);
    const lookup = buildFootprintLookup(data);
    expect(getPolygonCountAtTime(lookup, 50)).toBe(1); // t=0 の範囲内 → timeSizes[0]=1
    expect(getPolygonCountAtTime(lookup, 100)).toBe(2); // t=100 → timeSizes[1]=2
    expect(getPolygonCountAtTime(lookup, 150)).toBe(2); // t=100〜200 → timeSizes[1]=2
    expect(getPolygonCountAtTime(lookup, 200)).toBe(1); // t=200 → timeSizes[2]=1 (末尾クランプ)
  });
});
