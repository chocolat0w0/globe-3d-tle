/**
 * 衛星がAOI上空を通過する1回分の情報。
 * フットプリントとAOIが連続して重なるタイムステップ群を1つの Pass として集約する。
 */
export interface Pass {
  satelliteId: string;
  satelliteName: string;
  satelliteColor: string;
  /** 最初の重なりタイムステップ (UTC epoch ms) */
  startMs: number;
  /** 最後の重なりタイムステップ (UTC epoch ms) */
  endMs: number;
  /** (endMs - startMs) / 1000 */
  durationSec: number;
  /** パス中央時刻 — ジャンプ先として使用 (UTC epoch ms) */
  peakTimeMs: number;
  /** この Pass が所属する4時間窓の開始時刻 */
  windowStartMs: number;
}

/** 通過予測の計算結果全体 */
export interface PassPredictionResult {
  passes: Pass[];
  /** スキャンした4時間窓の数 */
  scannedWindows: number;
  /** 計算にかかった時間 (ms) */
  computeTimeMs: number;
}
