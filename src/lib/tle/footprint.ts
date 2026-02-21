import { satellite as geo4326Satellite, flatten } from "geo4326";

export interface FootprintParams {
  fov: [number, number];
  offnadir: number;
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
 * @param params フットプリントパラメータ（fov, offnadir, insert）
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

  const { fov, offnadir, insert } = params;

  for (let i = 0; i < count; i++) {
    const t = startMs + i * stepMs;
    try {
      const date = new Date(t);
      const ring = geo4326Satellite.footprint(tle1, tle2, date, { fov, offnadir, insert });
      const cut = flatten.cutRingAtAntimeridian(ring);

      // within + outside を結合。どちらも空の場合は元のリングをフォールバックとして使用
      const polys =
        cut.within.length > 0 || cut.outside.length > 0
          ? [...cut.within, ...cut.outside]
          : [ring];

      timesArr.push(t);
      timeSizesArr.push(polys.length);

      for (const poly of polys) {
        const startPairIdx = ringsArr.length / 2;
        offsetsArr.push(startPairIdx);
        countsArr.push(poly.length);
        for (const point of poly) {
          ringsArr.push(point[0], point[1]); // lon, lat
        }
      }
    } catch {
      // 計算失敗した時刻はスキップ（invalid TLE や地平線以下の場合など）
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
