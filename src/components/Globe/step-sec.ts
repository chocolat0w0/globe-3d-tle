/** カメラ高度（m）から stepSec を決定する */
export function getStepSecForHeight(heightM: number): number {
  if (heightM < 5_000_000) return 5;
  if (heightM < 20_000_000) return 10;
  return 20;
}
