import { describe, it, expect } from "vitest";
import { computePasses } from "../compute-passes";
import type { FootprintData } from "../../../types/orbit";
import type { AoiPoint, AoiPolygon } from "../../../types/polygon";

/**
 * テスト用 FootprintData を生成するヘルパー。
 *
 * 各タイムステップに1つのポリゴン（正方形）を配置する。
 * polygonFn(stepIndex) で各ステップのポリゴン頂点を指定できる。
 */
function createMockFootprintData(
  startMs: number,
  stepMs: number,
  stepCount: number,
  polygonFn: (stepIndex: number) => [number, number][] | null,
): FootprintData {
  const timesMs: number[] = [];
  const allVertices: number[] = [];
  const offsets: number[] = [];
  const counts: number[] = [];
  const timeSizes: number[] = [];

  let vertexPairCount = 0;

  for (let i = 0; i < stepCount; i++) {
    const t = startMs + i * stepMs;
    const poly = polygonFn(i);

    timesMs.push(t);

    if (poly && poly.length >= 3) {
      offsets.push(vertexPairCount);
      counts.push(poly.length);
      timeSizes.push(1);
      for (const [lon, lat] of poly) {
        allVertices.push(lon, lat);
      }
      vertexPairCount += poly.length;
    } else {
      // ポリゴンなし（高度が低すぎて見えない等）
      timeSizes.push(0);
    }
  }

  return {
    timesMs: new Float64Array(timesMs),
    rings: new Float32Array(allVertices),
    offsets: new Int32Array(offsets),
    counts: new Int32Array(counts),
    timeSizes: new Int32Array(timeSizes),
  };
}

/** dateline分割（2ポリゴン/ステップ）のモックを生成 */
function createDatelineSplitMock(
  startMs: number,
  stepMs: number,
  stepCount: number,
  polyPairFn: (stepIndex: number) => [[number, number][], [number, number][]],
): FootprintData {
  const timesMs: number[] = [];
  const allVertices: number[] = [];
  const offsets: number[] = [];
  const counts: number[] = [];
  const timeSizes: number[] = [];

  let vertexPairCount = 0;

  for (let i = 0; i < stepCount; i++) {
    timesMs.push(startMs + i * stepMs);
    const [poly1, poly2] = polyPairFn(i);

    timeSizes.push(2);

    for (const poly of [poly1, poly2]) {
      offsets.push(vertexPairCount);
      counts.push(poly.length);
      for (const [lon, lat] of poly) {
        allVertices.push(lon, lat);
      }
      vertexPairCount += poly.length;
    }
  }

  return {
    timesMs: new Float64Array(timesMs),
    rings: new Float32Array(allVertices),
    offsets: new Int32Array(offsets),
    counts: new Int32Array(counts),
    timeSizes: new Int32Array(timeSizes),
  };
}

describe("computePasses", () => {
  const BASE_MS = 1_709_712_000_000; // 2024-03-06T08:00:00Z
  const STEP_MS = 5_000; // 5秒

  const meta = {
    satelliteId: "sat-1",
    satelliteName: "TEST-SAT",
    satelliteColor: "#ff0000",
  };

  describe("AoiPoint (点AOI)", () => {
    const aoiPoint: AoiPoint = {
      type: "Point",
      coordinate: [135, 35], // 大阪付近
    };

    it("フットプリントが常にAOI上にある場合、1つのパスを返す", () => {
      // 全ステップで大阪を含む大きなフットプリント
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 5, () => [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPoint,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(1);
      expect(passes[0].satelliteId).toBe("sat-1");
      expect(passes[0].startMs).toBe(BASE_MS);
      expect(passes[0].endMs).toBe(BASE_MS + 4 * STEP_MS);
      expect(passes[0].durationSec).toBe(20);
    });

    it("フットプリントがAOIから離れている場合、パスは返さない", () => {
      // 全ステップでAOIから離れた場所のフットプリント
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 5, () => [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPoint,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(0);
    });

    it("パスが途中で切れる場合、2つの別々のパスを返す", () => {
      // step 0-2: AOI上、step 3-5: 離れる（3ステップのギャップ）、step 6-8: AOI上
      // 自動推定 gap tolerance = STEP_MS * 1.5 = 7500ms なので、
      // 3ステップ分のギャップ（15000ms）は確実に別パスになる
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 9, (i) => {
        if (i >= 3 && i <= 5) {
          return [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ];
        }
        return [
          [130, 30],
          [140, 30],
          [140, 40],
          [130, 40],
        ];
      });

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPoint,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(2);
      expect(passes[0].startMs).toBe(BASE_MS);
      expect(passes[0].endMs).toBe(BASE_MS + 2 * STEP_MS);
      expect(passes[1].startMs).toBe(BASE_MS + 6 * STEP_MS);
      expect(passes[1].endMs).toBe(BASE_MS + 8 * STEP_MS);
    });

    it("明示的な gapToleranceMs で大きなギャップも1つのパスとして統合する", () => {
      // step 0-2: hit, step 3-5: miss（3ステップのギャップ=15000ms）, step 6-8: hit
      // 自動推定tolerance(7500ms)では別パスだが、明示30000msで統合される
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 9, (i) => {
        if (i >= 3 && i <= 5) {
          return [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ];
        }
        return [
          [130, 30],
          [140, 30],
          [140, 40],
          [130, 40],
        ];
      });

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPoint,
        windowStartMs: BASE_MS,
        gapToleranceMs: 30_000, // 30秒のgap tolerance → 統合される
      });

      expect(passes).toHaveLength(1);
      expect(passes[0].startMs).toBe(BASE_MS);
      expect(passes[0].endMs).toBe(BASE_MS + 8 * STEP_MS);
    });

    it("peakTimeMs はパスの中央時刻", () => {
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 3, () => [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPoint,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(1);
      expect(passes[0].peakTimeMs).toBe(Math.round((BASE_MS + BASE_MS + 2 * STEP_MS) / 2));
    });
  });

  describe("AoiPolygon (ポリゴンAOI)", () => {
    const aoiPolygon: AoiPolygon = {
      type: "Polygon",
      coordinates: [
        [134, 34],
        [136, 34],
        [136, 36],
        [134, 36],
      ],
    };

    it("フットプリントとAOIが部分的に重なる場合にパスを検出する", () => {
      // 大きなフットプリントがAOIの一部を含む
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 3, () => [
        [133, 33],
        [135, 33],
        [135, 35],
        [133, 35],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPolygon,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(1);
    });

    it("AOIがフットプリントに完全に含まれる場合にパスを検出する", () => {
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 3, () => [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPolygon,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(1);
    });

    it("フットプリントとAOIが完全に離れている場合はパスなし", () => {
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 3, () => [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiPolygon,
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(0);
    });
  });

  describe("dateline分割フットプリント", () => {
    it("2つのサブポリゴンのうち片方がAOIと重なればhitとする", () => {
      const aoiNearDateline: AoiPoint = {
        type: "Point",
        coordinate: [175, 0],
      };

      // dateline分割: [170,180] と [-180,-170]
      const fpData = createDatelineSplitMock(BASE_MS, STEP_MS, 3, () => [
        // 東側 (170-180)
        [
          [170, -5],
          [180, -5],
          [180, 5],
          [170, 5],
        ],
        // 西側 (-180 to -170)
        [
          [-180, -5],
          [-170, -5],
          [-170, 5],
          [-180, 5],
        ],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: aoiNearDateline,
        windowStartMs: BASE_MS,
      });

      // 東側のサブポリゴンに含まれるのでhit
      expect(passes).toHaveLength(1);
    });
  });

  describe("エッジケース", () => {
    it("空のFootprintDataでは空配列を返す", () => {
      const emptyData: FootprintData = {
        timesMs: new Float64Array(0),
        rings: new Float32Array(0),
        offsets: new Int32Array(0),
        counts: new Int32Array(0),
        timeSizes: new Int32Array(0),
      };

      const passes = computePasses({
        ...meta,
        footprintData: emptyData,
        aoi: { type: "Point", coordinate: [0, 0] },
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(0);
    });

    it("1ステップだけのhitは durationSec=0 のパスになる", () => {
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 1, () => [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
      ]);

      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: { type: "Point", coordinate: [135, 35] },
        windowStartMs: BASE_MS,
      });

      expect(passes).toHaveLength(1);
      expect(passes[0].durationSec).toBe(0);
      expect(passes[0].startMs).toBe(BASE_MS);
      expect(passes[0].endMs).toBe(BASE_MS);
    });

    it("windowStartMs がパスのメタデータに正しく設定される", () => {
      const fpData = createMockFootprintData(BASE_MS, STEP_MS, 1, () => [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
      ]);

      const windowMs = 999_999;
      const passes = computePasses({
        ...meta,
        footprintData: fpData,
        aoi: { type: "Point", coordinate: [135, 35] },
        windowStartMs: windowMs,
      });

      expect(passes[0].windowStartMs).toBe(windowMs);
    });
  });
});
