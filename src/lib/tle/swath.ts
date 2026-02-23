import { satellite as geo4326Satellite, flatten } from "geo4326";
import { isZeroWidthRange, validateOffnadirRanges } from "./offnadir-ranges";
import type { OffnadirRange } from "./offnadir-ranges";

export interface SwathParams {
  offnadirRanges: OffnadirRange[];
  split?: number;
}

export interface ComputeSwathResult {
  rings: Float32Array;
  offsets: Int32Array;
  counts: Int32Array;
}

/**
 * TLEと時刻範囲から1日窓のスワス（掃引範囲）を計算する
 *
 * - geo4326.satellite.accessArea() で帯状ポリゴンを生成
 * - cutRingAtAntimeridian() で dateline 跨ぎを分割
 * - 結果を FlatRings 形式にパックして返す
 *
 * @param tle1 TLE第1行
 * @param tle2 TLE第2行
 * @param startMs 開始時刻（UTC epoch ms）
 * @param durationMs 計算期間（ms）
 * @param params スワスパラメータ（offnadirRanges, split）
 */
export function computeSwath(
  tle1: string,
  tle2: string,
  startMs: number,
  durationMs: number,
  params: SwathParams,
): ComputeSwathResult {
  const { offnadirRanges, split } = params;
  validateOffnadirRanges(offnadirRanges);

  const effectiveRanges = offnadirRanges.filter((range) => !isZeroWidthRange(range));
  if (effectiveRanges.length === 0) {
    return {
      rings: new Float32Array(),
      offsets: new Int32Array(),
      counts: new Int32Array(),
    };
  }

  const start = new Date(startMs);
  const end = new Date(startMs + durationMs);

  const ringsArr: number[] = [];
  const offsetsArr: number[] = [];
  const countsArr: number[] = [];

  for (const offnadirRange of effectiveRanges) {
    // split が未指定のときはキー自体を渡さず、geo4326 側のデフォルト値を使う
    const accessAreaOptions =
      split === undefined ? { roll: offnadirRange } : { roll: offnadirRange, split };

    // accessArea は期間全体の観測可能範囲を Points[] で返す
    const areaRings = geo4326Satellite.accessArea(tle1, tle2, start, end, accessAreaOptions);

    for (const ring of areaRings) {
      // dateline 跨ぎを分割
      const cut = flatten.cutRingAtAntimeridian(ring);
      const polys =
        cut.within.length > 0 || cut.outside.length > 0 ? [...cut.within, ...cut.outside] : [ring];

      for (const poly of polys) {
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
    rings: new Float32Array(ringsArr),
    offsets: new Int32Array(offsetsArr),
    counts: new Int32Array(countsArr),
  };
}
