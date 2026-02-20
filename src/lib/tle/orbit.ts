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
export function computeOrbit(
  tle1: string,
  tle2: string,
  startMs: number,
  durationMs: number,
  stepSec: number
): OrbitData {
  const satrec = twoline2satrec(tle1, tle2);
  const stepMs = stepSec * 1000;
  const count = Math.floor(durationMs / stepMs) + 1;

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
