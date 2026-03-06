import { eciToEcf, gstime, type EciVec3, type Kilometer } from "satellite.js";
import type { OrbitData } from "../../types/orbit";
import { pointInPolygon } from "../geo/point-in-polygon";
import { bisectLeft } from "../footprint/footprint-interpolator";

export const CUSTOM_SATELLITE_ID = "custom-launch";
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000;
const MU_M3_S2 = 3.986_004_418e14;
const DAY_MS = 86_400_000;
const DEG_PER_RAD = 180 / Math.PI;

export type CameraMode = "detail" | "wide";

export interface CustomSatelliteDraft {
  altitudeKm: number;
  inclinationDeg: number;
  cameraMode: CameraMode;
}

export interface LaunchedCustomSatellite extends CustomSatelliteDraft {
  launchEpochMs: number;
  orbitPeriodMin: number;
  speedKmS: number;
  orbitsPerDay: number;
  japanPassesPerDay: number;
  footprintFovDeg: number;
}

export interface ComputeCustomOrbitDataOptions {
  altitudeKm: number;
  inclinationDeg: number;
  launchEpochMs: number;
  startMs: number;
  durationMs: number;
  stepSec: number;
}

export interface CustomRealtimePosition {
  latDeg: number;
  lonDeg: number;
  altKm: number;
  speedKmS: number;
}

export const CAMERA_FOV_DEG: Record<CameraMode, number> = {
  detail: 6,
  wide: 18,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCustomDraft(input: CustomSatelliteDraft): CustomSatelliteDraft {
  return {
    altitudeKm: clamp(input.altitudeKm, 200, 36_000),
    inclinationDeg: clamp(input.inclinationDeg, 0, 98),
    cameraMode: input.cameraMode,
  };
}

export function getFootprintFovDeg(cameraMode: CameraMode): number {
  return CAMERA_FOV_DEG[cameraMode];
}

export function computeOrbitPeriodMin(altitudeKm: number): number {
  const radiusM = EARTH_RADIUS_M + altitudeKm * 1000;
  const nRadS = Math.sqrt(MU_M3_S2 / radiusM ** 3);
  return (2 * Math.PI) / nRadS / 60;
}

export function computeOrbitSpeedKmS(altitudeKm: number): number {
  const radiusM = EARTH_RADIUS_M + altitudeKm * 1000;
  const speedMS = Math.sqrt(MU_M3_S2 / radiusM);
  return speedMS / 1000;
}

function computeEcefAtMs(
  altitudeKm: number,
  inclinationDeg: number,
  launchEpochMs: number,
  targetMs: number,
): { x: number; y: number; z: number } {
  const radiusKm = EARTH_RADIUS_KM + altitudeKm;
  const radiusM = radiusKm * 1000;
  const nRadS = Math.sqrt(MU_M3_S2 / radiusM ** 3);
  const dtSec = (targetMs - launchEpochMs) / 1000;
  const argument = nRadS * dtSec;
  const inclinationRad = (inclinationDeg * Math.PI) / 180;

  const orbitalXKm = radiusKm * Math.cos(argument);
  const orbitalYKm = radiusKm * Math.sin(argument);

  const eciXKm = orbitalXKm;
  const eciYKm = orbitalYKm * Math.cos(inclinationRad);
  const eciZKm = orbitalYKm * Math.sin(inclinationRad);

  const gmst = gstime(new Date(targetMs));
  const ecefKm = eciToEcf({ x: eciXKm, y: eciYKm, z: eciZKm } as EciVec3<Kilometer>, gmst);

  return {
    x: ecefKm.x * 1000,
    y: ecefKm.y * 1000,
    z: ecefKm.z * 1000,
  };
}

export function computeCustomOrbitData(options: ComputeCustomOrbitDataOptions): OrbitData {
  const { altitudeKm, inclinationDeg, launchEpochMs, startMs, durationMs, stepSec } = options;

  if (!Number.isFinite(stepSec) || stepSec <= 0) {
    throw new RangeError(`stepSec must be finite and positive, got: ${stepSec}`);
  }

  const stepMs = stepSec * 1000;
  const count = Math.floor(durationMs / stepMs) + 1;
  const timesMs = new Float64Array(count);
  const ecef = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const t = startMs + i * stepMs;
    const p = computeEcefAtMs(altitudeKm, inclinationDeg, launchEpochMs, t);
    timesMs[i] = t;
    const offset = i * 3;
    ecef[offset] = p.x;
    ecef[offset + 1] = p.y;
    ecef[offset + 2] = p.z;
  }

  return { timesMs, ecef };
}

export function interpolateEcefAtMs(
  orbitData: OrbitData,
  targetMs: number,
): { x: number; y: number; z: number } | null {
  const { timesMs, ecef } = orbitData;
  const n = timesMs.length;
  if (n === 0) return null;

  const i = bisectLeft(timesMs, targetMs);

  if (i >= n - 1) {
    const offset = (n - 1) * 3;
    return { x: ecef[offset], y: ecef[offset + 1], z: ecef[offset + 2] };
  }

  const t0 = timesMs[i];
  const t1 = timesMs[i + 1];
  const dt = t1 - t0;
  const alpha = dt > 0 ? (targetMs - t0) / dt : 0;

  const off0 = i * 3;
  const off1 = (i + 1) * 3;
  return {
    x: ecef[off0] + (ecef[off1] - ecef[off0]) * alpha,
    y: ecef[off0 + 1] + (ecef[off1 + 1] - ecef[off0 + 1]) * alpha,
    z: ecef[off0 + 2] + (ecef[off1 + 2] - ecef[off0 + 2]) * alpha,
  };
}

export function ecefToGeodeticApprox(position: { x: number; y: number; z: number }): {
  latDeg: number;
  lonDeg: number;
  altKm: number;
} {
  const { x, y, z } = position;
  const lonDeg = Math.atan2(y, x) * DEG_PER_RAD;
  const horizontal = Math.sqrt(x * x + y * y);
  const latDeg = Math.atan2(z, horizontal) * DEG_PER_RAD;
  const altKm = Math.sqrt(x * x + y * y + z * z) / 1000 - EARTH_RADIUS_KM;
  return { latDeg, lonDeg, altKm };
}

export function countRegionEntriesPerDay(
  orbitData: OrbitData,
  polygons: ReadonlyArray<ReadonlyArray<[number, number]>>,
): number {
  const { ecef } = orbitData;
  if (ecef.length < 3) return 0;

  let previousInside = false;
  let entries = 0;

  for (let i = 0; i < ecef.length; i += 3) {
    const geodetic = ecefToGeodeticApprox({
      x: ecef[i],
      y: ecef[i + 1],
      z: ecef[i + 2],
    });

    const point: [number, number] = [geodetic.lonDeg, geodetic.latDeg];
    const inside = polygons.some((polygon) => pointInPolygon(point, polygon as [number, number][]));

    if (!previousInside && inside) {
      entries += 1;
    }
    previousInside = inside;
  }

  return entries;
}

export function buildLaunchedCustomSatellite(
  draft: CustomSatelliteDraft,
  launchEpochMs: number,
  regionPolygons: ReadonlyArray<ReadonlyArray<[number, number]>>,
  stepSec = 30,
): LaunchedCustomSatellite {
  const normalized = normalizeCustomDraft(draft);
  const orbitPeriodMin = computeOrbitPeriodMin(normalized.altitudeKm);
  const speedKmS = computeOrbitSpeedKmS(normalized.altitudeKm);
  const orbitsPerDay = DAY_MS / (orbitPeriodMin * 60 * 1000);

  const dayOrbit = computeCustomOrbitData({
    altitudeKm: normalized.altitudeKm,
    inclinationDeg: normalized.inclinationDeg,
    launchEpochMs,
    startMs: launchEpochMs,
    durationMs: DAY_MS,
    stepSec,
  });

  const japanPassesPerDay = countRegionEntriesPerDay(dayOrbit, regionPolygons);

  return {
    ...normalized,
    launchEpochMs,
    orbitPeriodMin,
    speedKmS,
    orbitsPerDay,
    japanPassesPerDay,
    footprintFovDeg: getFootprintFovDeg(normalized.cameraMode),
  };
}

export function computeCustomRealtimePosition(
  launched: LaunchedCustomSatellite,
  targetMs: number,
): CustomRealtimePosition {
  const ecef = computeEcefAtMs(
    launched.altitudeKm,
    launched.inclinationDeg,
    launched.launchEpochMs,
    targetMs,
  );
  const geodetic = ecefToGeodeticApprox(ecef);

  return {
    latDeg: geodetic.latDeg,
    lonDeg: geodetic.lonDeg,
    altKm: geodetic.altKm,
    speedKmS: launched.speedKmS,
  };
}

/**
 * 球面近似で中心点から一定距離の円ポリゴンを生成する。
 */
export function buildGroundCircle(
  centerLonDeg: number,
  centerLatDeg: number,
  radiusKm: number,
  segments = 48,
): [number, number][] {
  if (radiusKm <= 0) return [];

  const angularDistance = radiusKm / EARTH_RADIUS_KM;
  const lat1 = (centerLatDeg * Math.PI) / 180;
  const lon1 = (centerLonDeg * Math.PI) / 180;
  const result: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const bearing = (2 * Math.PI * i) / segments;
    const sinLat2 =
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing);
    const lat2 = Math.asin(sinLat2);
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      );

    result.push([lon2 * DEG_PER_RAD, lat2 * DEG_PER_RAD]);
  }

  return result;
}

export function estimateGroundRadiusKm(altitudeKm: number, fovDeg: number): number {
  const halfAngleRad = ((fovDeg / 2) * Math.PI) / 180;
  const radius = altitudeKm * Math.tan(halfAngleRad);
  return clamp(radius, 40, 4500);
}
