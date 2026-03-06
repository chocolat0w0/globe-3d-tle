import { describe, expect, it } from "vitest";
import type { OrbitData } from "../../../types/orbit";
import {
  computeCustomOrbitData,
  computeOrbitPeriodMin,
  computeOrbitSpeedKmS,
  countRegionEntriesPerDay,
  ecefToGeodeticApprox,
} from "../custom-orbit";

const EARTH_RADIUS_KM = 6371;

function maxAbsLatitudeDeg(orbitData: OrbitData): number {
  let max = 0;
  for (let i = 0; i < orbitData.ecef.length; i += 3) {
    const geo = ecefToGeodeticApprox({
      x: orbitData.ecef[i],
      y: orbitData.ecef[i + 1],
      z: orbitData.ecef[i + 2],
    });
    max = Math.max(max, Math.abs(geo.latDeg));
  }
  return max;
}

function lonLatToEcef(lonDeg: number, latDeg: number, altKm: number): [number, number, number] {
  const lonRad = (lonDeg * Math.PI) / 180;
  const latRad = (latDeg * Math.PI) / 180;
  const radius = (EARTH_RADIUS_KM + altKm) * 1000;

  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.cos(latRad) * Math.sin(lonRad);
  const z = radius * Math.sin(latRad);

  return [x, y, z];
}

describe("custom-orbit", () => {
  it("高度が上がると周期が長くなり、速度が下がる", () => {
    const lowPeriod = computeOrbitPeriodMin(400);
    const highPeriod = computeOrbitPeriodMin(1200);
    const lowSpeed = computeOrbitSpeedKmS(400);
    const highSpeed = computeOrbitSpeedKmS(1200);

    expect(highPeriod).toBeGreaterThan(lowPeriod);
    expect(highSpeed).toBeLessThan(lowSpeed);
  });

  it("傾きが大きいほど到達する緯度の最大値が増える", () => {
    const launchEpochMs = Date.UTC(2026, 2, 6, 0, 0, 0);

    const lowInclination = computeCustomOrbitData({
      altitudeKm: 700,
      inclinationDeg: 20,
      launchEpochMs,
      startMs: launchEpochMs,
      durationMs: 6 * 3600 * 1000,
      stepSec: 30,
    });

    const highInclination = computeCustomOrbitData({
      altitudeKm: 700,
      inclinationDeg: 80,
      launchEpochMs,
      startMs: launchEpochMs,
      durationMs: 6 * 3600 * 1000,
      stepSec: 30,
    });

    expect(maxAbsLatitudeDeg(highInclination)).toBeGreaterThan(maxAbsLatitudeDeg(lowInclination));
  });

  it("領域への進入イベント（outside→inside）回数を数える", () => {
    const timesMs = new Float64Array([0, 1, 2, 3, 4]);
    const p0 = lonLatToEcef(-5, 0, 500);
    const p1 = lonLatToEcef(0, 0, 500);
    const p2 = lonLatToEcef(0.5, 0.5, 500);
    const p3 = lonLatToEcef(5, 0, 500);
    const p4 = lonLatToEcef(0, 0, 500);
    const ecef = new Float32Array([...p0, ...p1, ...p2, ...p3, ...p4]);

    const orbitData: OrbitData = { timesMs, ecef };
    const square: [number, number][] = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ];

    const entries = countRegionEntriesPerDay(orbitData, [square]);
    expect(entries).toBe(2);
  });
});
