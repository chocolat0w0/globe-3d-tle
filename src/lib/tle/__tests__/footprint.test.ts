import { describe, it, expect } from "vitest";
import { computeFootprints } from "../footprint";
import type { FootprintParams } from "../footprint";

// ---------------------------------------------------------------------------
// TLE fixtures
// ---------------------------------------------------------------------------

/**
 * ISS TLE — epoch near 2024-01-01T12:00:00Z.
 * Known to produce valid footprints for reasonable offnadir/fov values.
 */
const ISS_TLE1 =
  "1 25544U 98067A   24001.50000000  .00020137  00000-0  36371-3 0  9993";
const ISS_TLE2 =
  "2 25544  51.6400 337.6580 0001584  86.9974 273.1408 15.50008824429730";

/** 2024-01-01T12:00:00Z — aligns with TLE epoch for deterministic propagation */
const TLE_EPOCH_MS = 1704110400000;

// ---------------------------------------------------------------------------
// Default footprint parameters
// ---------------------------------------------------------------------------

/**
 * Representative footprint parameters: ±1° cross-track FOV, 0° offnadir.
 * These produce a small but non-degenerate footprint polygon for ISS.
 */
const DEFAULT_PARAMS: FootprintParams = {
  fov: [1, 1],
  offnadir: 0,
};

// ---------------------------------------------------------------------------
// Helper: sum of an Int32Array
// ---------------------------------------------------------------------------

function sumInt32(arr: Int32Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeFootprints", () => {
  // -------------------------------------------------------------------------
  // Return-type integrity
  // -------------------------------------------------------------------------

  describe("return type integrity", () => {
    it("returns the correct TypedArray types for all five result fields", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000, // 1 hour
        30,
        DEFAULT_PARAMS
      );

      expect(result.timesMs).toBeInstanceOf(Float64Array);
      expect(result.rings).toBeInstanceOf(Float32Array);
      expect(result.offsets).toBeInstanceOf(Int32Array);
      expect(result.counts).toBeInstanceOf(Int32Array);
      expect(result.timeSizes).toBeInstanceOf(Int32Array);
    });

    it("returns non-empty arrays when given a valid TLE near epoch", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      expect(result.timesMs.length).toBeGreaterThan(0);
      expect(result.timeSizes.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Sample count
  // -------------------------------------------------------------------------

  describe("sample count", () => {
    it("produces exactly 121 samples for stepSec=30 over durationMs=3_600_000 (1 hour)", () => {
      // floor(3600000 / 30000) + 1 = 120 + 1 = 121
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      // timesMs holds only the timestamps for which footprint computation succeeded.
      // For a valid TLE near epoch, all 121 steps should succeed.
      expect(result.timesMs.length).toBe(121);
    });

    it("produces exactly 1 sample when durationMs=0 (start point only)", () => {
      // floor(0 / stepMs) + 1 = 0 + 1 = 1 step attempted
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        0,
        30,
        DEFAULT_PARAMS
      );

      // Only the start time is attempted; it should succeed near epoch.
      expect(result.timesMs.length).toBe(1);
      expect(result.timeSizes.length).toBe(1);
    });

    it("produces more samples when durationMs doubles, holding stepSec constant", () => {
      const result1h = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );
      const result2h = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        7_200_000,
        30,
        DEFAULT_PARAMS
      );

      // 2-hour window must have more timestamps than 1-hour window
      expect(result2h.timesMs.length).toBeGreaterThan(result1h.timesMs.length);
    });
  });

  // -------------------------------------------------------------------------
  // FlatRings structural invariants
  // -------------------------------------------------------------------------

  describe("FlatRings structural invariants", () => {
    it("timesMs.length equals timeSizes.length (one entry per succeeded timestamp)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      expect(result.timesMs.length).toBe(result.timeSizes.length);
    });

    it("offsets.length equals counts.length (one offset and count per polygon)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      expect(result.offsets.length).toBe(result.counts.length);
    });

    it("sum of timeSizes equals offsets.length (total polygon count across all timestamps)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      const totalPolygons = sumInt32(result.timeSizes);
      expect(result.offsets.length).toBe(totalPolygons);
    });

    it("rings.length equals sum(counts) * 2 (two floats per lon/lat coordinate pair)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      const totalCoordPairs = sumInt32(result.counts);
      expect(result.rings.length).toBe(totalCoordPairs * 2);
    });

    it("all timeSizes values are at least 1 (each succeeded timestamp has at least one polygon)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      for (let i = 0; i < result.timeSizes.length; i++) {
        expect(result.timeSizes[i]).toBeGreaterThanOrEqual(1);
      }
    });

    it("all counts values are positive (no empty polygon stored)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      for (let i = 0; i < result.counts.length; i++) {
        expect(result.counts[i]).toBeGreaterThan(0);
      }
    });
  });

  // -------------------------------------------------------------------------
  // FlatRings packing correctness
  // -------------------------------------------------------------------------

  describe("FlatRings packing correctness", () => {
    it("offsets[0] is 0 (first polygon starts at the beginning of rings)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      expect(result.offsets[0]).toBe(0);
    });

    it("offsets are strictly non-decreasing across all polygons", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      for (let i = 1; i < result.offsets.length; i++) {
        expect(result.offsets[i]).toBeGreaterThanOrEqual(result.offsets[i - 1]);
      }
    });

    it("each offsets[i] equals the sum of all preceding counts (contiguous packing)", () => {
      // offsets[i] should equal sum(counts[0..i-1]) — i.e., polygons are packed
      // contiguously with no gaps. We verify this by reconstructing the expected
      // offset for each polygon from counts.
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      let expectedOffset = 0;
      for (let i = 0; i < result.offsets.length; i++) {
        expect(result.offsets[i]).toBe(expectedOffset);
        expectedOffset += result.counts[i];
      }
    });

    it("last polygon ends exactly at rings boundary (offsets[last] + counts[last] == rings.length / 2)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      const n = result.offsets.length;
      if (n === 0) return; // guard: skip if all steps failed (shouldn't happen near epoch)

      const lastStart = result.offsets[n - 1];
      const lastCount = result.counts[n - 1];
      expect(lastStart + lastCount).toBe(result.rings.length / 2);
    });
  });

  // -------------------------------------------------------------------------
  // Timestamp correctness
  // -------------------------------------------------------------------------

  describe("timestamp correctness", () => {
    it("timesMs[0] equals startMs when the first step produces a valid footprint", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      expect(result.timesMs[0]).toBe(TLE_EPOCH_MS);
    });

    it("consecutive timesMs values differ by exactly stepSec * 1000 ms when all steps succeed", () => {
      const stepSec = 30;
      const stepMs = stepSec * 1000;

      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        stepSec,
        DEFAULT_PARAMS
      );

      for (let i = 1; i < result.timesMs.length; i++) {
        expect(result.timesMs[i] - result.timesMs[i - 1]).toBe(stepMs);
      }
    });

    it("timesMs values are strictly monotonically increasing", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      for (let i = 1; i < result.timesMs.length; i++) {
        expect(result.timesMs[i]).toBeGreaterThan(result.timesMs[i - 1]);
      }
    });

    it("last timesMs value equals startMs + durationMs when all steps succeed", () => {
      const durationMs = 3_600_000;
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        durationMs,
        30,
        DEFAULT_PARAMS
      );

      expect(result.timesMs[result.timesMs.length - 1]).toBe(TLE_EPOCH_MS + durationMs);
    });
  });

  // -------------------------------------------------------------------------
  // Coordinate range validity
  // -------------------------------------------------------------------------

  describe("coordinate range validity", () => {
    it("all longitude values in rings are within [-180, 180]", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      // rings is interleaved [lon, lat, lon, lat, ...]; lon is at even indices
      for (let i = 0; i < result.rings.length; i += 2) {
        const lon = result.rings[i];
        expect(lon).toBeGreaterThanOrEqual(-180);
        expect(lon).toBeLessThanOrEqual(180);
      }
    });

    it("all latitude values in rings are within [-90, 90]", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      // rings is interleaved [lon, lat, lon, lat, ...]; lat is at odd indices
      for (let i = 1; i < result.rings.length; i += 2) {
        const lat = result.rings[i];
        expect(lat).toBeGreaterThanOrEqual(-90);
        expect(lat).toBeLessThanOrEqual(90);
      }
    });

    it("all rings values are finite (no NaN or Infinity stored)", () => {
      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        DEFAULT_PARAMS
      );

      for (let i = 0; i < result.rings.length; i++) {
        expect(isFinite(result.rings[i])).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // stepSec validation (error cases)
  // -------------------------------------------------------------------------

  describe("stepSec validation", () => {
    it("throws RangeError when stepSec is 0", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 0, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is -1", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, -1, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is negative", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, -100, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is Infinity", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, Infinity, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is NaN", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, NaN, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError with an informative message when stepSec is 0", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 3_600_000, 0, DEFAULT_PARAMS)
      ).toThrow(/stepSec must be a finite positive number/);
    });

    it("throws RangeError when stepSec=0.001 over durationMs=86_400_000 exceeds MAX_SAMPLE_COUNT=100_000", () => {
      // stepMs = 1 ms → count = floor(86400000 / 1) + 1 = 86_400_001 >> 100_000
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, 0.001, DEFAULT_PARAMS)
      ).toThrow(RangeError);
    });

    it("throws RangeError mentioning sample count when limit is exceeded", () => {
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, 0.001, DEFAULT_PARAMS)
      ).toThrow(/exceeding the limit of 100000/);
    });

    it("does not throw when stepSec produces exactly 100_000 samples", () => {
      // count = floor(durationMs / stepMs) + 1 = 100_000
      // floor(86400000 / stepMs) = 99999 → stepMs = 86400000 / 99999
      const stepSec = 86_400_000 / (99_999 * 1000);
      expect(() =>
        computeFootprints(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, stepSec, DEFAULT_PARAMS)
      ).not.toThrow(RangeError);
    });
  });

  // -------------------------------------------------------------------------
  // Invalid TLE: graceful degradation
  // -------------------------------------------------------------------------

  describe("invalid TLE handling", () => {
    it("returns empty arrays when both TLE lines are empty strings", () => {
      // geo4326 will throw or return NaN for invalid TLE; all steps must be skipped
      const result = computeFootprints("", "", TLE_EPOCH_MS, 3_600_000, 300, DEFAULT_PARAMS);

      expect(result.timesMs.length).toBe(0);
      expect(result.rings.length).toBe(0);
      expect(result.offsets.length).toBe(0);
      expect(result.counts.length).toBe(0);
      expect(result.timeSizes.length).toBe(0);
    });

    it("returns empty arrays when TLE lines contain garbage text", () => {
      const result = computeFootprints(
        "NOT A VALID TLE LINE ONE",
        "NOT A VALID TLE LINE TWO",
        TLE_EPOCH_MS,
        3_600_000,
        300,
        DEFAULT_PARAMS
      );

      expect(result.timesMs.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // UTC day boundary
  // -------------------------------------------------------------------------

  describe("UTC day boundary", () => {
    it("produces valid results when the time window spans a UTC midnight boundary", () => {
      // Start 30 minutes before midnight UTC 2024-01-01 → window covers into 2024-01-02
      const nearMidnightMs = Date.UTC(2024, 0, 1, 23, 30, 0);

      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        nearMidnightMs,
        3_600_000, // 1 hour — crosses midnight
        30,
        DEFAULT_PARAMS
      );

      // The function should produce data without throwing
      expect(result.timesMs.length).toBeGreaterThan(0);
      // Structural invariants still hold across the day boundary
      expect(result.timesMs.length).toBe(result.timeSizes.length);
      expect(sumInt32(result.timeSizes)).toBe(result.offsets.length);
    });
  });

  // -------------------------------------------------------------------------
  // insert parameter support
  // -------------------------------------------------------------------------

  describe("FootprintParams: optional insert parameter", () => {
    it("produces the same structural invariants when insert is specified", () => {
      const paramsWithInsert: FootprintParams = {
        fov: [1, 1],
        offnadir: 0,
        insert: 4,
      };

      const result = computeFootprints(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        30,
        paramsWithInsert
      );

      // Structural invariants must hold regardless of the insert parameter
      expect(result.timesMs.length).toBe(result.timeSizes.length);
      expect(result.offsets.length).toBe(result.counts.length);
      expect(sumInt32(result.timeSizes)).toBe(result.offsets.length);
      expect(result.rings.length).toBe(sumInt32(result.counts) * 2);
    });
  });
});
