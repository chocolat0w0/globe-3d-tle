import { satellite as geo4326Satellite, flatten } from "geo4326";
import { validateOffnadirRanges } from "./offnadir-ranges";
import type { OffnadirRange } from "./offnadir-ranges";

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
      // geo4326.footprint() は単一角を受けるため、レンジは端点を代表値として評価する。
      const [minDeg, maxDeg] = offnadirRange;
      const offnadirCandidates = minDeg === maxDeg ? [minDeg] : [minDeg, maxDeg];

      for (const offnadirDeg of offnadirCandidates) {
        try {
          const ring = geo4326Satellite.footprint(tle1, tle2, date, {
            fov,
            offnadir: offnadirDeg,
            insert,
          });
          const cut = flatten.cutRingAtAntimeridian(ring);
          // within + outside を結合。どちらも空の場合は元のリングをフォールバックとして使用
          const polys =
            cut.within.length > 0 || cut.outside.length > 0
              ? [...cut.within, ...cut.outside]
              : [ring];
          polysAtTime.push(...polys);
        } catch {
          // 計算失敗したレンジ端点はスキップ（特定角度での不成立など）
        }
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
