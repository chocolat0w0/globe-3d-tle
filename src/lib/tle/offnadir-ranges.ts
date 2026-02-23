export type OffnadirRange = [number, number];

const MIN_OFFNADIR_DEG = -90;
const MAX_OFFNADIR_DEG = 90;

export function validateOffnadirRanges(offnadirRanges: OffnadirRange[]): void {
  if (offnadirRanges.length === 0) {
    throw new RangeError("offnadirRanges must contain at least one range");
  }

  for (let i = 0; i < offnadirRanges.length; i++) {
    const [minDeg, maxDeg] = offnadirRanges[i];
    if (!Number.isFinite(minDeg) || !Number.isFinite(maxDeg)) {
      throw new RangeError(
        `offnadirRanges[${i}] must contain finite numbers, got: [${minDeg}, ${maxDeg}]`,
      );
    }
    if (minDeg > maxDeg) {
      throw new RangeError(
        `offnadirRanges[${i}] must satisfy minDeg <= maxDeg, got: [${minDeg}, ${maxDeg}]`,
      );
    }
    if (minDeg < MIN_OFFNADIR_DEG || maxDeg > MAX_OFFNADIR_DEG) {
      throw new RangeError(
        `offnadirRanges[${i}] must be within [${MIN_OFFNADIR_DEG}, ${MAX_OFFNADIR_DEG}], got: [${minDeg}, ${maxDeg}]`,
      );
    }
  }
}

export function isZeroWidthRange([minDeg, maxDeg]: OffnadirRange): boolean {
  return minDeg === maxDeg;
}
