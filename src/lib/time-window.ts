/** 4時間窓（rolling window）のミリ秒 */
export const WINDOW_MS = 4 * 3600 * 1000;

/** 4時間単位に丸めた窓開始時刻を返す */
export function getWindowStartMs(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

/** ランダムなリクエスト ID を生成する */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
