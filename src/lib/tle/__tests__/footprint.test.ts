import { describe, it, expect } from "vitest";
import { computeFootprints } from "../footprint";
import type { FootprintParams } from "../footprint";

const ISS_TLE1 = "1 25544U 98067A   24001.50000000  .00020137  00000-0  36371-3 0  9993";
const ISS_TLE2 = "2 25544  51.6400 337.6580 0001584  86.9974 273.1408 15.50008824429730";
const TLE_EPOCH_MS = 1704110400000; // 2024-01-01T12:00:00Z

const DEFAULT_PARAMS: FootprintParams = {
  fov: [1, 1],
  offnadirRanges: [[-30, 30]],
};

function sumInt32(arr: Int32Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

describe("computeFootprints", () => {
  it("returns typed arrays for valid params", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, DEFAULT_PARAMS);

    expect(result.timesMs).toBeInstanceOf(Float64Array);
    expect(result.rings).toBeInstanceOf(Float32Array);
    expect(result.offsets).toBeInstanceOf(Int32Array);
    expect(result.counts).toBeInstanceOf(Int32Array);
    expect(result.timeSizes).toBeInstanceOf(Int32Array);
  });

  it("satisfies FlatRings structural invariants", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, DEFAULT_PARAMS);

    expect(result.timesMs.length).toBe(result.timeSizes.length);
    expect(result.offsets.length).toBe(result.counts.length);
    expect(sumInt32(result.timeSizes)).toBe(result.offsets.length);
    expect(result.rings.length).toBe(sumInt32(result.counts) * 2);
  });

  it("supports [[0,0]] as nadir observation", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
      fov: [1, 1],
      offnadirRanges: [[0, 0]],
    });

    expect(result.timesMs.length).toBeGreaterThan(0);
    expect(result.offsets.length).toBeGreaterThan(0);
  });

  it("supports one-sided ranges", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
      fov: [1, 1],
      offnadirRanges: [[15, 45]],
    });

    expect(result.timesMs.length).toBeGreaterThan(0);
    expect(result.offsets.length).toBeGreaterThan(0);
  });

  it("supports non-contiguous ranges", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
      fov: [1, 1],
      offnadirRanges: [[-45, -15], [15, 45]],
    });

    expect(result.timesMs.length).toBeGreaterThan(0);
    expect(result.offsets.length).toBeGreaterThan(0);
  });

  describe("offnadirRanges validation", () => {
    it("throws on empty ranges", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
          fov: [1, 1],
          offnadirRanges: [],
        }),
      ).toThrow(RangeError);
    });

    it("throws when min > max", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
          fov: [1, 1],
          offnadirRanges: [[30, -10]],
        }),
      ).toThrow(RangeError);
    });

    it("throws when out of [-90,90]", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
          fov: [1, 1],
          offnadirRanges: [[-100, 10]],
        }),
      ).toThrow(RangeError);
    });

    it("throws when values are non-finite", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
          fov: [1, 1],
          offnadirRanges: [[0, NaN]],
        }),
      ).toThrow(RangeError);
    });
  });

  describe("stepSec validation", () => {
    it("throws when stepSec <= 0", () => {
      expect(() => computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 0, DEFAULT_PARAMS)).toThrow(
        RangeError,
      );
      expect(() => computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, -1, DEFAULT_PARAMS)).toThrow(
        RangeError,
      );
    });

    it("throws when stepSec is non-finite", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, Infinity, DEFAULT_PARAMS),
      ).toThrow(RangeError);
    });
  });

  it("returns empty arrays for invalid TLE", () => {
    const result = computeFootprints("", "", TLE_EPOCH_MS, 3_600_000, 300, DEFAULT_PARAMS);
    expect(result.timesMs.length).toBe(0);
    expect(result.rings.length).toBe(0);
    expect(result.offsets.length).toBe(0);
    expect(result.counts.length).toBe(0);
    expect(result.timeSizes.length).toBe(0);
  });

  it("keeps invariants when insert is provided", () => {
    const result = computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 30, {
      fov: [1, 1],
      offnadirRanges: [[-30, 30]],
      insert: 4,
    });

    expect(result.timesMs.length).toBe(result.timeSizes.length);
    expect(result.offsets.length).toBe(result.counts.length);
  });
});
