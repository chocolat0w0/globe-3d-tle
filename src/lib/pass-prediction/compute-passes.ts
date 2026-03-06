import type { FootprintData } from "../../types/orbit";
import type { Aoi } from "../../types/polygon";
import type { Pass } from "../../types/pass";
import { buildFootprintLookup } from "../footprint/footprint-interpolator";
import { extractFootprintPolygonsAtStep } from "./extract-footprint-at-step";
import { pointInPolygon } from "../geo/point-in-polygon";
import { polygonsOverlap } from "../geo/polygons-overlap";

export interface ComputePassesOptions {
  satelliteId: string;
  satelliteName: string;
  satelliteColor: string;
  footprintData: FootprintData;
  aoi: Aoi;
  windowStartMs: number;
  /**
   * ギャップ許容時間 (ms)。この時間以内の非重なりはパス内の隙間として扱う。
   * 未指定の場合、timesMs から自動推定したステップ間隔の 1.5 倍を使用する。
   */
  gapToleranceMs?: number;
}

/**
 * FootprintData の全タイムステップをスキャンし、AOI と重なるパスを検出する。
 *
 * 連続する重なりタイムステップを1つの Pass にグルーピングする。
 * gapToleranceMs 以内の非重なりステップはパス内の隙間として無視する。
 *
 * @returns Pass[] を startMs 昇順でソートして返す
 */
export function computePasses(options: ComputePassesOptions): Pass[] {
  const {
    satelliteId,
    satelliteName,
    satelliteColor,
    footprintData,
    aoi,
    windowStartMs,
    gapToleranceMs: explicitGapTolerance,
  } = options;

  const { timesMs } = footprintData;
  const n = timesMs.length;
  if (n === 0) return [];

  // gapToleranceMs が未指定の場合、ステップ間隔から自動推定する
  // ステップ間隔の 1.5 倍を許容値とすることで、連続ヒットが確実にグルーピングされる
  const gapToleranceMs =
    explicitGapTolerance ?? (n >= 2 ? (timesMs[1] - timesMs[0]) * 1.5 : 0);

  const lookup = buildFootprintLookup(footprintData);

  // 各タイムステップでの重なり判定
  const hits: number[] = []; // hitしたタイムステップの timesMs 値

  for (let i = 0; i < n; i++) {
    const polygons = extractFootprintPolygonsAtStep(footprintData, lookup, i);
    if (polygons.length === 0) continue;

    let isHit = false;
    for (const fpPoly of polygons) {
      if (aoi.type === "Point") {
        if (pointInPolygon(aoi.coordinate, fpPoly)) {
          isHit = true;
          break;
        }
      } else {
        // AoiPolygon
        if (polygonsOverlap(aoi.coordinates, fpPoly)) {
          isHit = true;
          break;
        }
      }
    }

    if (isHit) {
      hits.push(timesMs[i]);
    }
  }

  // 連続する hit をパスにグルーピング
  return groupIntoPasses(hits, gapToleranceMs, {
    satelliteId,
    satelliteName,
    satelliteColor,
    windowStartMs,
  });
}

/** 連続 hit をグルーピングして Pass[] を返す */
function groupIntoPasses(
  hits: number[],
  gapToleranceMs: number,
  meta: {
    satelliteId: string;
    satelliteName: string;
    satelliteColor: string;
    windowStartMs: number;
  },
): Pass[] {
  if (hits.length === 0) return [];

  const passes: Pass[] = [];
  let passStart = hits[0];
  let passEnd = hits[0];

  for (let i = 1; i < hits.length; i++) {
    if (hits[i] - passEnd <= gapToleranceMs) {
      // 同一パス内（gap tolerance以内）
      passEnd = hits[i];
    } else {
      // 新しいパスの開始
      passes.push(createPass(passStart, passEnd, meta));
      passStart = hits[i];
      passEnd = hits[i];
    }
  }

  // 最後のパスを追加
  passes.push(createPass(passStart, passEnd, meta));

  return passes;
}

function createPass(
  startMs: number,
  endMs: number,
  meta: {
    satelliteId: string;
    satelliteName: string;
    satelliteColor: string;
    windowStartMs: number;
  },
): Pass {
  return {
    ...meta,
    startMs,
    endMs,
    durationSec: (endMs - startMs) / 1000,
    peakTimeMs: Math.round((startMs + endMs) / 2),
  };
}
