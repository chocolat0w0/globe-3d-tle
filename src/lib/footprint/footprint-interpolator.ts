import type { FootprintData } from "../../types/orbit";

export interface FootprintLookup {
  data: FootprintData;
  /** timeSizes の累積和 — 各タイムステップの開始ポリゴン絶対インデックス */
  timePolyStarts: Int32Array;
}

/**
 * FootprintData からルックアップを構築する。
 * timeSizes の累積和を事前計算することで、O(1) でポリゴン開始位置を参照できる。
 */
export function buildFootprintLookup(data: FootprintData): FootprintLookup {
  const { timeSizes } = data;
  const timePolyStarts = new Int32Array(timeSizes.length);
  let acc = 0;
  for (let i = 0; i < timeSizes.length; i++) {
    timePolyStarts[i] = acc;
    acc += timeSizes[i];
  }
  return { data, timePolyStarts };
}

/**
 * timesMs を二分探索して targetMs 以下の最大インデックスを返す。
 * targetMs が先頭未満の場合は 0、末尾超の場合は length-1 を返す。
 */
export function bisectLeft(timesMs: Float64Array, targetMs: number): number {
  if (timesMs.length === 0) return 0;
  let lo = 0;
  let hi = timesMs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (timesMs[mid] <= targetMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * 指定時刻の最近傍タイムステップにおけるポリゴン数（1 or 2）を返す。
 * dateline 分割がある場合は 2 を返す。
 */
export function getPolygonCountAtTime(lookup: FootprintLookup, currentMs: number): number {
  const { data } = lookup;
  if (data.timesMs.length === 0) return 0;
  const idx = bisectLeft(data.timesMs, currentMs);
  return data.timeSizes[idx];
}

/**
 * antimeridian ラッピングを考慮した経度の線形補間。
 * 例: 170° → -170° (差 -340°) を正しく 20° の補間に変換する。
 */
export function lerpLon(lon0: number, lon1: number, alpha: number): number {
  let diff = lon1 - lon0;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;
  let result = lon0 + alpha * diff;
  if (result > 180) result -= 360;
  else if (result < -180) result += 360;
  return result;
}

/** 指定絶対ポリゴンインデックスの頂点を [lon, lat][] として抽出する（補間なし）。 */
function extractVertices(
  data: FootprintData,
  polyAbsIndex: number,
): Array<[number, number]> | null {
  const offset = data.offsets[polyAbsIndex];
  const count = data.counts[polyAbsIndex];
  if (count < 3) return null;
  const result: Array<[number, number]> = [];
  for (let k = 0; k < count; k++) {
    result.push([data.rings[(offset + k) * 2], data.rings[(offset + k) * 2 + 1]]);
  }
  return result;
}

/**
 * 補間済み頂点配列 [lon, lat][] を返す。
 *
 * 以下の場合はスナップ（最近傍サンプルそのまま）にフォールバックする:
 * - timeSizes が隣接ステップ間で変化する（dateline 遷移）
 * - 頂点数が隣接ステップ間で一致しない
 * - polyIndex がポリゴン数以上（secondary polygon が不要な場合）
 *
 * @param polyIndex 0: primary, 1: dateline 分割時の secondary
 * @returns [lon, lat][] または null（ポリゴンが存在しない場合）
 */
export function interpolatePolygonVertices(
  lookup: FootprintLookup,
  currentMs: number,
  polyIndex: number,
): Array<[number, number]> | null {
  const { data, timePolyStarts } = lookup;
  const n = data.timesMs.length;
  if (n === 0) return null;

  const idx = bisectLeft(data.timesMs, currentMs);

  // 末尾クランプ: 最終サンプルをそのまま返す
  if (idx >= n - 1) {
    if (polyIndex >= data.timeSizes[n - 1]) return null;
    return extractVertices(data, timePolyStarts[n - 1] + polyIndex);
  }

  // dateline 遷移（ポリゴン数変化）→ 最近傍にスナップ
  if (data.timeSizes[idx] !== data.timeSizes[idx + 1]) {
    const snapIdx =
      currentMs - data.timesMs[idx] < data.timesMs[idx + 1] - currentMs ? idx : idx + 1;
    if (polyIndex >= data.timeSizes[snapIdx]) return null;
    return extractVertices(data, timePolyStarts[snapIdx] + polyIndex);
  }

  // polyIndex がこのタイムステップのポリゴン数以上 → null（secondary 不要）
  if (polyIndex >= data.timeSizes[idx]) return null;

  const absIdx0 = timePolyStarts[idx] + polyIndex;
  const absIdx1 = timePolyStarts[idx + 1] + polyIndex;

  // 頂点数不一致 → 最近傍にスナップ
  if (data.counts[absIdx0] !== data.counts[absIdx1]) {
    const snapIdx =
      currentMs - data.timesMs[idx] < data.timesMs[idx + 1] - currentMs ? idx : idx + 1;
    return extractVertices(data, timePolyStarts[snapIdx] + polyIndex);
  }

  // 線形補間
  const t0 = data.timesMs[idx];
  const t1 = data.timesMs[idx + 1];
  const dt = t1 - t0;
  const alpha = dt > 0 ? (currentMs - t0) / dt : 0;

  const count = data.counts[absIdx0];
  const off0 = data.offsets[absIdx0];
  const off1 = data.offsets[absIdx1];

  const result: Array<[number, number]> = [];
  for (let k = 0; k < count; k++) {
    const lon0 = data.rings[(off0 + k) * 2];
    const lat0 = data.rings[(off0 + k) * 2 + 1];
    const lon1 = data.rings[(off1 + k) * 2];
    const lat1 = data.rings[(off1 + k) * 2 + 1];
    result.push([lerpLon(lon0, lon1, alpha), lat0 + alpha * (lat1 - lat0)]);
  }
  return result;
}
