import { describe, it, expect } from "vitest";
import { computeOrbit } from "../../src/lib/tle/orbit";

/**
 * ISS TLE (epoch: 2024-01-01T12:00:00Z = 1704110400000 ms)
 * Verified to produce valid propagation results near epoch.
 */
const ISS_TLE1 =
  "1 25544U 98067A   24001.50000000  .00020137  00000-0  36144-3 0  9994";
const ISS_TLE2 =
  "2 25544  51.6418 249.4983 0001234  87.3234 272.6560 15.49815361432523";

/** 2024-01-01T12:00:00Z — matches TLE epoch exactly for deterministic propagation */
const TLE_EPOCH_MS = 1704110400000;

/** Earth radius in meters (mean spherical). ISS ECEF magnitude must exceed this. */
const EARTH_RADIUS_M = 6_371_000;

/**
 * ISS orbital altitude range in meters above Earth's surface.
 * Typical ISS altitude is 400–450 km. We use a generous bound to
 * accommodate orbital variation over 1-hour windows.
 */
const ISS_MIN_ALTITUDE_M = 300_000; // 300 km minimum bound (generous lower margin)
const ISS_MAX_ALTITUDE_M = 500_000; // 500 km maximum bound (generous upper margin)

describe("computeOrbit", () => {
  describe("return type integrity", () => {
    it("returns a Float64Array for timesMs and a Float32Array for ecef", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      expect(result.timesMs).toBeInstanceOf(Float64Array);
      expect(result.ecef).toBeInstanceOf(Float32Array);
    });

    it("returns non-empty arrays when given a valid TLE and time near epoch", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      expect(result.timesMs.length).toBeGreaterThan(0);
      expect(result.ecef.length).toBeGreaterThan(0);
    });
  });

  describe("sample count", () => {
    it("produces approximately floor(durationMs / stepSec / 1000) + 1 samples for stepSec=300 over 1 hour", () => {
      const durationMs = 3_600_000;
      const stepSec = 300;
      const expectedCount = Math.floor(durationMs / (stepSec * 1000)) + 1; // 13

      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        durationMs,
        stepSec
      );

      // Propagation near epoch succeeds for all points, so exact count is expected.
      expect(result.timesMs.length).toBe(expectedCount);
    });

    it("produces a single sample when durationMs equals zero", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        0,
        300
      );

      // floor(0 / stepMs) + 1 = 1 step (only the start time)
      expect(result.timesMs.length).toBe(1);
      // ecef must have exactly 3 components for that one point
      expect(result.ecef.length).toBe(3);
    });

    it("produces a proportionally larger sample count when durationMs doubles", () => {
      const stepSec = 300;

      const result1h = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        stepSec
      );
      const result2h = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        7_200_000,
        stepSec
      );

      // 2-hour window should produce roughly twice as many samples as 1-hour
      expect(result2h.timesMs.length).toBeGreaterThan(result1h.timesMs.length);
      expect(result2h.timesMs.length).toBe(result1h.timesMs.length * 2 - 1);
    });
  });

  describe("ecef array structure", () => {
    it("ecef.length equals timesMs.length * 3 (x, y, z per sample point)", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      expect(result.ecef.length).toBe(result.timesMs.length * 3);
    });

    it("ecef.length equals timesMs.length * 3 for a shorter stepSec=60 window", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        1_800_000, // 30 minutes
        60
      );

      expect(result.ecef.length).toBe(result.timesMs.length * 3);
    });
  });

  describe("ECEF coordinate validity", () => {
    it("each sample point has a distance from Earth center greater than Earth radius", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      for (let i = 0; i < result.timesMs.length; i++) {
        const x = result.ecef[i * 3];
        const y = result.ecef[i * 3 + 1];
        const z = result.ecef[i * 3 + 2];
        const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);

        expect(distanceFromCenter).toBeGreaterThan(EARTH_RADIUS_M);
      }
    });

    it("ISS orbital altitude for each sample point is within 300–500 km above Earth surface", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      for (let i = 0; i < result.timesMs.length; i++) {
        const x = result.ecef[i * 3];
        const y = result.ecef[i * 3 + 1];
        const z = result.ecef[i * 3 + 2];
        const distanceFromCenter = Math.sqrt(x * x + y * y + z * z);
        const altitude = distanceFromCenter - EARTH_RADIUS_M;

        expect(altitude).toBeGreaterThan(ISS_MIN_ALTITUDE_M);
        expect(altitude).toBeLessThan(ISS_MAX_ALTITUDE_M);
      }
    });

    it("all ECEF component values are finite (not NaN, not Infinity)", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      for (let i = 0; i < result.ecef.length; i++) {
        expect(isFinite(result.ecef[i])).toBe(true);
      }
    });
  });

  describe("timesMs monotonicity and values", () => {
    it("timesMs values are strictly monotonically increasing", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      for (let i = 1; i < result.timesMs.length; i++) {
        expect(result.timesMs[i]).toBeGreaterThan(result.timesMs[i - 1]);
      }
    });

    it("timesMs first value equals startMs when propagation succeeds at epoch", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );

      // Exact match expected: the epoch time is stored without modification
      expect(result.timesMs[0]).toBe(TLE_EPOCH_MS);
    });

    it("timesMs last value equals startMs + durationMs when all steps propagate successfully", () => {
      const durationMs = 3_600_000;
      const stepSec = 300;

      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        durationMs,
        stepSec
      );

      const expectedLastTime = TLE_EPOCH_MS + durationMs;
      expect(result.timesMs[result.timesMs.length - 1]).toBe(expectedLastTime);
    });

    it("consecutive timesMs values differ by exactly stepSec * 1000 milliseconds", () => {
      const stepSec = 300;
      const stepMs = stepSec * 1000;

      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        stepSec
      );

      for (let i = 1; i < result.timesMs.length; i++) {
        expect(result.timesMs[i] - result.timesMs[i - 1]).toBe(stepMs);
      }
    });
  });

  describe("stepSec validation", () => {
    it("throws RangeError when stepSec is 0 (would cause infinite loop)", () => {
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, 0)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is negative", () => {
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, -1)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is NaN", () => {
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, NaN)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is Infinity", () => {
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, Infinity)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec is -Infinity", () => {
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, -Infinity)
      ).toThrow(RangeError);
    });

    it("throws RangeError when stepSec produces more than 100_000 samples", () => {
      // stepSec=0.864 → count = floor(86400000 / 864) + 1 = 100001 > 100000
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, 0.864)
      ).toThrow(RangeError);
    });

    it("does not throw when stepSec produces exactly 100_000 samples", () => {
      // stepSec=0.8640... → count = 100001 はNG, stepSec=86400/99999 → count=100000 はOK
      const stepSec = 86_400_000 / (99_999 * 1000); // count = floor(99999) + 1 = 100000
      expect(() =>
        computeOrbit(ISS_TLE1, ISS_TLE2, TLE_EPOCH_MS, 86_400_000, stepSec)
      ).not.toThrow();
    });
  });

  describe("stepSec boundary values", () => {
    it("stepSec=1 with durationMs=60000 (1 minute) produces 61 samples", () => {
      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        60_000,
        1
      );

      // floor(60000 / 1000) + 1 = 61
      expect(result.timesMs.length).toBe(61);
      expect(result.ecef.length).toBe(61 * 3);
    });

    it("stepSec equal to durationMs in seconds produces exactly 2 samples (start and end)", () => {
      const durationSec = 300;
      const durationMs = durationSec * 1000;

      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        durationMs,
        durationSec
      );

      // floor(durationMs / stepMs) + 1 = floor(1) + 1 = 2
      expect(result.timesMs.length).toBe(2);
      expect(result.timesMs[0]).toBe(TLE_EPOCH_MS);
      expect(result.timesMs[1]).toBe(TLE_EPOCH_MS + durationMs);
    });
  });

  describe("UTC day boundary correctness", () => {
    it("produces valid orbit data when startMs straddles a UTC day boundary", () => {
      // Start 30 minutes before midnight UTC on 2024-01-01 (23:30:00)
      const dayBoundaryMs = Date.UTC(2024, 0, 1, 23, 30, 0);

      const result = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        dayBoundaryMs,
        3_600_000, // 1 hour: spans into 2024-01-02
        300
      );

      // Should still produce samples (propagation works across day boundary)
      expect(result.timesMs.length).toBeGreaterThan(0);
      expect(result.ecef.length).toBe(result.timesMs.length * 3);

      // Verify the last time is in the next UTC day (2024-01-02)
      const lastTime = result.timesMs[result.timesMs.length - 1];
      const jan2Midnight = Date.UTC(2024, 0, 2, 0, 0, 0);
      expect(lastTime).toBeGreaterThan(jan2Midnight);
    });
  });
});
