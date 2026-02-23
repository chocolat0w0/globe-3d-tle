import { describe, it, expect } from "vitest";
import { computeSwath } from "../swath";

const ISS_TLE1 = "1 25544U 98067A   24001.50000000  .00020137  00000-0  36371-3 0  9993";
const ISS_TLE2 = "2 25544  51.6400 337.6580 0001584  86.9974 273.1408 15.50008824429730";
const TLE_EPOCH_MS = 1704110400000; // 2024-01-01T12:00:00Z

function sumInt32(arr: Int32Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

describe("computeSwath", () => {
  it("returns typed arrays with valid parameters", () => {
    const result = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-10, 10]],
      split: 60,
    });

    expect(result.rings).toBeInstanceOf(Float32Array);
    expect(result.offsets).toBeInstanceOf(Int32Array);
    expect(result.counts).toBeInstanceOf(Int32Array);
  });

  it("satisfies FlatRings structural invariants", () => {
    const result = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-10, 10]],
      split: 60,
    });

    expect(result.offsets.length).toBe(result.counts.length);
    expect(result.rings.length).toBe(sumInt32(result.counts) * 2);
    expect(result.offsets.length).toBeGreaterThan(0);
  });

  it("works when split is omitted (geo4326 default)", () => {
    const result = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-10, 10]],
    });

    expect(result.offsets.length).toBeGreaterThan(0);
    expect(result.offsets.length).toBe(result.counts.length);
  });

  it("returns an empty swath for [[0,0]] without throwing", () => {
    const result = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[0, 0]],
      split: 60,
    });

    expect(result.rings.length).toBe(0);
    expect(result.offsets.length).toBe(0);
    expect(result.counts.length).toBe(0);
  });

  it("supports one-sided ranges", () => {
    const result = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[15, 45]],
      split: 60,
    });

    expect(result.offsets.length).toBeGreaterThan(0);
    expect(result.rings.length).toBeGreaterThan(0);
  });

  it("supports non-contiguous ranges and differs from contiguous [-45,45]", () => {
    const contiguous = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-45, 45]],
      split: 60,
    });
    const separated = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-45, -15], [15, 45]],
      split: 60,
    });

    expect(separated.offsets.length).toBeGreaterThan(0);
    expect(Array.from(separated.rings)).not.toEqual(Array.from(contiguous.rings));
  });

  it("left-only and right-only ranges produce different geometry", () => {
    const left = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[15, 45]],
      split: 60,
    });
    const right = computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
      offnadirRanges: [[-45, -15]],
      split: 60,
    });

    expect(left.offsets.length).toBeGreaterThan(0);
    expect(right.offsets.length).toBeGreaterThan(0);
    expect(Array.from(left.rings)).not.toEqual(Array.from(right.rings));
  });

  describe("offnadirRanges validation", () => {
    it("throws on empty ranges", () => {
      expect(() =>
        computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
          offnadirRanges: [],
          split: 60,
        }),
      ).toThrow(RangeError);
    });

    it("throws when min > max", () => {
      expect(() =>
        computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
          offnadirRanges: [[30, -30]],
          split: 60,
        }),
      ).toThrow(RangeError);
    });

    it("throws when out of [-90,90]", () => {
      expect(() =>
        computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
          offnadirRanges: [[-91, 10]],
          split: 60,
        }),
      ).toThrow(RangeError);
    });

    it("throws when values are non-finite", () => {
      expect(() =>
        computeSwath(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, {
          offnadirRanges: [[0, Infinity]],
          split: 60,
        }),
      ).toThrow(RangeError);
    });
  });

  it("still throws for invalid TLE when range is non-zero", () => {
    expect(() =>
      computeSwath("", "", TLE_EPOCH_MS, 3_600_000, {
        offnadirRanges: [[-10, 10]],
        split: 60,
      }),
    ).toThrow();
  });
});
