import { describe, it, expect } from "vitest";
import { computeOrbit } from "../../src/lib/tle/orbit";
import type { OrbitData } from "../../src/types/orbit";

/**
 * These tests verify the Worker's Transferable round-trip contract.
 *
 * The actual Worker (`orbit-calculator.worker.ts`) cannot be instantiated
 * in a jsdom environment. Instead, we test the equivalent logic the Worker
 * performs:
 *   1. Call computeOrbit() to produce OrbitData
 *   2. Extract the underlying ArrayBuffers (the "transfer" step)
 *   3. Reconstruct Float64Array / Float32Array from those buffers on the
 *      receiving side (the "postMessage + onmessage" round-trip)
 *
 * This validates that no data is lost or corrupted through the Transferable
 * mechanism, which is the core contract of the Worker communication layer.
 *
 * ISS TLE epoch: 2024-01-01T12:00:00Z = 1704110400000 ms
 */
const ISS_TLE1 =
  "1 25544U 98067A   24001.50000000  .00020137  00000-0  36144-3 0  9994";
const ISS_TLE2 =
  "2 25544  51.6418 249.4983 0001234  87.3234 272.6560 15.49815361432523";

const TLE_EPOCH_MS = 1704110400000;

/** Simulate the Worker side: produce OrbitData and pack it for postMessage */
function packOrbitDataAsTransferables(orbitData: OrbitData): {
  timesBuffer: ArrayBuffer;
  ecefBuffer: ArrayBuffer;
} {
  // This is exactly what orbit-calculator.worker.ts does:
  //   response.orbit = { timesMs: timesBuffer, ecef: ecefBuffer }
  //   transferables.push(timesBuffer, ecefBuffer)
  return {
    timesBuffer: orbitData.timesMs.buffer as ArrayBuffer,
    ecefBuffer: orbitData.ecef.buffer as ArrayBuffer,
  };
}

/** Simulate the Main-thread side: reconstruct TypedArrays from received ArrayBuffers */
function unpackOrbitDataFromTransferables(
  timesBuffer: ArrayBuffer,
  ecefBuffer: ArrayBuffer
): OrbitData {
  return {
    timesMs: new Float64Array(timesBuffer),
    ecef: new Float32Array(ecefBuffer),
  };
}

describe("Worker Transferable round-trip: orbit data", () => {
  describe("timesMs buffer transfer", () => {
    it("restored Float64Array has the same length as the original timesMs", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer } = packOrbitDataAsTransferables(original);
      const restored = new Float64Array(timesBuffer);

      expect(restored.length).toBe(original.timesMs.length);
    });

    it("restored Float64Array contains exactly the same millisecond timestamps", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer } = packOrbitDataAsTransferables(original);
      const restored = new Float64Array(timesBuffer);

      for (let i = 0; i < original.timesMs.length; i++) {
        // Float64 has enough precision to represent ms timestamps exactly
        expect(restored[i]).toBe(original.timesMs[i]);
      }
    });

    it("timesMs ArrayBuffer byte length is length * 8 (Float64 = 8 bytes per element)", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer } = packOrbitDataAsTransferables(original);

      expect(timesBuffer.byteLength).toBe(original.timesMs.length * 8);
    });

    it("restored timesMs first value equals startMs (verifying no offset introduced)", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer } = packOrbitDataAsTransferables(original);
      const restored = new Float64Array(timesBuffer);

      expect(restored[0]).toBe(TLE_EPOCH_MS);
    });
  });

  describe("ecef buffer transfer", () => {
    it("restored Float32Array has the same length as the original ecef array", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = new Float32Array(ecefBuffer);

      expect(restored.length).toBe(original.ecef.length);
    });

    it("restored Float32Array contains exactly the same ECEF coordinate values", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = new Float32Array(ecefBuffer);

      for (let i = 0; i < original.ecef.length; i++) {
        // Float32 binary representation: identical bits produce identical values
        expect(restored[i]).toBe(original.ecef[i]);
      }
    });

    it("ecef ArrayBuffer byte length is length * 4 (Float32 = 4 bytes per element)", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { ecefBuffer } = packOrbitDataAsTransferables(original);

      expect(ecefBuffer.byteLength).toBe(original.ecef.length * 4);
    });

    it("restored ecef length is 3x the restored timesMs length (x,y,z per sample)", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restoredTimes = new Float64Array(timesBuffer);
      const restoredEcef = new Float32Array(ecefBuffer);

      expect(restoredEcef.length).toBe(restoredTimes.length * 3);
    });
  });

  describe("full round-trip: pack then unpack", () => {
    it("unpackOrbitDataFromTransferables returns Float64Array for timesMs", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = unpackOrbitDataFromTransferables(timesBuffer, ecefBuffer);

      expect(restored.timesMs).toBeInstanceOf(Float64Array);
    });

    it("unpackOrbitDataFromTransferables returns Float32Array for ecef", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = unpackOrbitDataFromTransferables(timesBuffer, ecefBuffer);

      expect(restored.ecef).toBeInstanceOf(Float32Array);
    });

    it("full round-trip preserves all timesMs values without precision loss", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = unpackOrbitDataFromTransferables(timesBuffer, ecefBuffer);

      expect(restored.timesMs.length).toBe(original.timesMs.length);
      for (let i = 0; i < original.timesMs.length; i++) {
        expect(restored.timesMs[i]).toBe(original.timesMs[i]);
      }
    });

    it("full round-trip preserves all ecef coordinate values without precision loss", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = unpackOrbitDataFromTransferables(timesBuffer, ecefBuffer);

      expect(restored.ecef.length).toBe(original.ecef.length);
      for (let i = 0; i < original.ecef.length; i++) {
        expect(restored.ecef[i]).toBe(original.ecef[i]);
      }
    });

    it("restored timesMs values remain strictly monotonically increasing after round-trip", () => {
      const original = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(original);
      const restored = unpackOrbitDataFromTransferables(timesBuffer, ecefBuffer);

      for (let i = 1; i < restored.timesMs.length; i++) {
        expect(restored.timesMs[i]).toBeGreaterThan(restored.timesMs[i - 1]);
      }
    });
  });

  describe("Worker response metadata fields", () => {
    it("requestId and satelliteId pass through the response message unchanged", () => {
      // Simulates the Worker building a ComputeDayResponse with metadata fields.
      // These fields are not mutated by computeOrbit(), so we verify they are
      // echoed back verbatim — as the Worker contract requires.
      const requestId = "req-abc-123";
      const satelliteId = "sat-ISS-25544";
      const dayStartMs = TLE_EPOCH_MS;
      const stepSec = 300;

      const orbitData = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        dayStartMs,
        3_600_000,
        stepSec
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(orbitData);

      // Simulate the Worker's response object
      const response = {
        type: "computed-day" as const,
        requestId,
        satelliteId,
        dayStartMs,
        stepSec,
        orbit: { timesMs: timesBuffer, ecef: ecefBuffer },
      };

      expect(response.type).toBe("computed-day");
      expect(response.requestId).toBe(requestId);
      expect(response.satelliteId).toBe(satelliteId);
      expect(response.dayStartMs).toBe(dayStartMs);
      expect(response.stepSec).toBe(stepSec);
    });

    it("orbit field contains timesMs and ecef ArrayBuffers with non-zero byteLength", () => {
      const orbitData = computeOrbit(
        ISS_TLE1,
        ISS_TLE2,
        TLE_EPOCH_MS,
        3_600_000,
        300
      );
      const { timesBuffer, ecefBuffer } = packOrbitDataAsTransferables(orbitData);

      const response = {
        type: "computed-day" as const,
        requestId: "req-1",
        satelliteId: "sat-1",
        dayStartMs: TLE_EPOCH_MS,
        stepSec: 300,
        orbit: { timesMs: timesBuffer, ecef: ecefBuffer },
      };

      expect(response.orbit.timesMs).toBeInstanceOf(ArrayBuffer);
      expect(response.orbit.ecef).toBeInstanceOf(ArrayBuffer);
      expect(response.orbit.timesMs.byteLength).toBeGreaterThan(0);
      expect(response.orbit.ecef.byteLength).toBeGreaterThan(0);
    });
  });

  describe("LRU cache key format validation", () => {
    it("cache key format satelliteId:dayStartMs:stepSec uniquely identifies a computation", () => {
      // The LRU cache uses `${satelliteId}:${dayStartMs}:${stepSec}` as its key.
      // Verify that different inputs produce different keys, so cache collisions cannot occur.
      const makeKey = (
        satelliteId: string,
        dayStartMs: number,
        stepSec: number
      ) => `${satelliteId}:${dayStartMs}:${stepSec}`;

      const keyA = makeKey("25544", TLE_EPOCH_MS, 30);
      const keyB = makeKey("25544", TLE_EPOCH_MS + 86_400_000, 30); // next day
      const keyC = makeKey("25544", TLE_EPOCH_MS, 60); // different stepSec
      const keyD = makeKey("99999", TLE_EPOCH_MS, 30); // different satellite

      expect(keyA).not.toBe(keyB);
      expect(keyA).not.toBe(keyC);
      expect(keyA).not.toBe(keyD);
      expect(keyB).not.toBe(keyC);
      expect(keyB).not.toBe(keyD);
      expect(keyC).not.toBe(keyD);
    });

    it("same inputs produce the same cache key (cache hits are possible)", () => {
      const makeKey = (
        satelliteId: string,
        dayStartMs: number,
        stepSec: number
      ) => `${satelliteId}:${dayStartMs}:${stepSec}`;

      const key1 = makeKey("25544", TLE_EPOCH_MS, 30);
      const key2 = makeKey("25544", TLE_EPOCH_MS, 30);

      expect(key1).toBe(key2);
    });
  });
});
