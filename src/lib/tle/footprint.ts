import { satellite as geo4326Satellite, flatten } from "geo4326";
import { validateOffnadirRanges } from "./offnadir-ranges";
import type { OffnadirRange } from "./offnadir-ranges";

/**
 * offnadirRange を 0 度で分割する。
 * geo4326 内部でロール角の符号に依存した計算パスがあるため、
 * 0 度を跨ぐ範囲（例: [-5, 5]）は [-5, 0] と [0, 5] に分割して
 * 各側を同符号範囲として処理する。
 */
function splitAtZero(range: OffnadirRange): OffnadirRange[] {
  const [min, max] = range;
  if (min < 0 && max > 0) {
    return [[min, 0], [0, max]];
  }
  return [range];
}

/** 2D 外積（Andrew's monotone chain で左折/右折の判定に使用） */
function cross2d(O: number[], A: number[], B: number[]): number {
  return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
}

/**
 * 平面凸包（Andrew's monotone chain）。
 * lon/lat 座標に対して適用する（小スケールでは平面近似が有効）。
 * 戻り値は閉合したリング（末尾 == 先頭）。
 */
function convexHull(points: number[][]): number[][] {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const lower: number[][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross2d(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: number[][] = [];
  for (const p of [...sorted].reverse()) {
    while (upper.length >= 2 && cross2d(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  const hull = [...lower, ...upper];
  if (hull.length > 0) hull.push(hull[0]); // 閉合
  return hull;
}

/**
 * dateline 付近の lon 不連続を防ぐため、最初の点を基準に全点を ±180° 以内へ正規化。
 * 例: anchor=170 のとき -175 → 185 に変換し、凸包が dateline を跨がずに計算できる。
 */
function normalizeToAnchor(points: number[][]): number[][] {
  if (points.length === 0) return points;
  const anchor = points[0][0];
  return points.map(([lon, lat]) => {
    while (lon - anchor > 180) lon -= 360;
    while (lon - anchor < -180) lon += 360;
    return [lon, lat];
  });
}

export interface FootprintParams {
  fov: [number, number];
  offnadirRanges: OffnadirRange[];
  insert?: number;
}

export interface ComputeFootprintsResult {
  timesMs: Float64Array;
  rings: Float32Array;
  offsets: Int32Array;
  counts: Int32Array;
  timeSizes: Int32Array;
}

/** 1回の計算で生成できるサンプル数の上限 */
const MAX_SAMPLE_COUNT = 100_000;

/**
 * TLEと時刻範囲からフットプリントデータ（lon/lat ポリゴン列）を計算する
 *
 * - 各サンプル時刻で geo4326.satellite.footprint() を呼び出す
 * - cutRingAtAntimeridian() で dateline 跨ぎを分割
 * - 結果を FlatRings 形式にパックして返す
 *
 * @param tle1 TLE第1行
 * @param tle2 TLE第2行
 * @param startMs 開始時刻（UTC epoch ms）
 * @param durationMs 計算期間（ms）
 * @param stepSec サンプリング間隔（秒）
 * @param params フットプリントパラメータ（fov, offnadirRanges, insert）
 */
export function computeFootprints(
  tle1: string,
  tle2: string,
  startMs: number,
  durationMs: number,
  stepSec: number,
  params: FootprintParams
): ComputeFootprintsResult {
  if (!isFinite(stepSec) || stepSec <= 0) {
    throw new RangeError(`stepSec must be a finite positive number, got: ${stepSec}`);
  }

  const stepMs = stepSec * 1000;
  const count = Math.floor(durationMs / stepMs) + 1;

  if (count > MAX_SAMPLE_COUNT) {
    throw new RangeError(
      `stepSec=${stepSec} produces ${count} samples, exceeding the limit of ${MAX_SAMPLE_COUNT}`
    );
  }

  const timesArr: number[] = [];
  const ringsArr: number[] = [];
  const offsetsArr: number[] = [];
  const countsArr: number[] = [];
  const timeSizesArr: number[] = [];

  const { fov, offnadirRanges, insert } = params;
  validateOffnadirRanges(offnadirRanges);

  for (let i = 0; i < count; i++) {
    const t = startMs + i * stepMs;
    const date = new Date(t);
    const polysAtTime: number[][][] = [];

    for (const offnadirRange of offnadirRanges) {
      // 0 度を跨ぐ範囲は符号ごとに分割して処理する（geo4326 内部が符号依存のため）
      const subRanges = splitAtZero(offnadirRange);

      for (const [minDeg, maxDeg] of subRanges) {
        // 端点（min/max）でそれぞれフットプリントを計算し、凸包で統合する
        const candidates = minDeg === maxDeg ? [minDeg] : [minDeg, maxDeg];
        const endpointRings: number[][][] = [];

        for (const offnadirDeg of candidates) {
          try {
            const ring = geo4326Satellite.footprint(tle1, tle2, date, {
              fov,
              offnadir: offnadirDeg,
              insert,
            });
            endpointRings.push(ring);
          } catch {
            // 特定角度で不成立の場合はスキップ
          }
        }

        if (endpointRings.length === 0) continue;

        let mergedRing: number[][];
        if (endpointRings.length === 1) {
          mergedRing = endpointRings[0];
        } else {
          // 全頂点を anchor 正規化してから凸包で外包を計算
          const allPoints = endpointRings.flat();
          const normalized = normalizeToAnchor(allPoints);
          const hull = convexHull(normalized);
          if (hull.length < 3) continue;
          mergedRing = hull;
        }

        const cut = flatten.cutRingAtAntimeridian(mergedRing);
        const polys =
          cut.within.length > 0 || cut.outside.length > 0
            ? [...cut.within, ...cut.outside]
            : [mergedRing];
        polysAtTime.push(...polys);
      }
    }

    if (polysAtTime.length > 0) {
      timesArr.push(t);
      timeSizesArr.push(polysAtTime.length);

      for (const poly of polysAtTime) {
        const startPairIdx = ringsArr.length / 2;
        offsetsArr.push(startPairIdx);
        countsArr.push(poly.length);
        for (const point of poly) {
          ringsArr.push(point[0], point[1]); // lon, lat
        }
      }
    }
  }

  return {
    timesMs: new Float64Array(timesArr),
    rings: new Float32Array(ringsArr),
    offsets: new Int32Array(offsetsArr),
    counts: new Int32Array(countsArr),
    timeSizes: new Int32Array(timeSizesArr),
  };
}
