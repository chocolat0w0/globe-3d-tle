import {
  twoline2satrec,
  propagate,
  gstime,
  eciToEcf,
  type EciVec3,
  type Kilometer,
} from "satellite.js";
import type { OrbitData } from "../../types/orbit";

/** km → m の変換係数 */
const KM_TO_M = 1000;

/**
 * TLEと時刻範囲から軌道データ（ECEF座標列）を計算する
 *
 * @param tle1 TLE第1行
 * @param tle2 TLE第2行
 * @param startMs 開始時刻（UTC epoch ms）
 * @param durationMs 計算期間（ms）
 * @param stepSec サンプリング間隔（秒）
 * @returns OrbitData（計算に失敗した点はスキップ）
 */
/** 1回の計算で生成できるサンプル数の上限（stepSec が極小の場合の保護） */
const MAX_SAMPLE_COUNT = 100_000;

export function computeOrbit(
  tle1: string,
  tle2: string,
  startMs: number,
  durationMs: number,
  stepSec: number
): OrbitData {
  if (!isFinite(stepSec) || stepSec <= 0) {
    throw new RangeError(`stepSec must be a finite positive number, got: ${stepSec}`);
  }

  const satrec = twoline2satrec(tle1, tle2);
  const stepMs = stepSec * 1000;
  const count = Math.floor(durationMs / stepMs) + 1;

  if (count > MAX_SAMPLE_COUNT) {
    throw new RangeError(
      `stepSec=${stepSec} produces ${count} samples, exceeding the limit of ${MAX_SAMPLE_COUNT}`
    );
  }

  const timesMs: number[] = [];
  const ecefPoints: number[] = [];

  for (let i = 0; i < count; i++) {
    const t = startMs + i * stepMs;
    const date = new Date(t);
    const posVel = propagate(satrec, date);

    // propagate は計算失敗時に position が false になる
    if (!posVel || !posVel.position || typeof posVel.position === "boolean") continue;

    const gmst = gstime(date);
    const ecf = eciToEcf(posVel.position as EciVec3<Kilometer>, gmst);

    timesMs.push(t);
    // satellite.js は km 単位 → m に変換
    ecefPoints.push(ecf.x * KM_TO_M, ecf.y * KM_TO_M, ecf.z * KM_TO_M);
  }

  return {
    timesMs: new Float64Array(timesMs),
    ecef: new Float32Array(ecefPoints),
  };
}
