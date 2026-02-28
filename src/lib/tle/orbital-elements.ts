import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLat,
  degreesLong,
  type EciVec3,
  type Kilometer,
} from "satellite.js";

/** 地球の平均半径 (m) */
const R_EARTH_M = 6_371_000;

/** 標準重力定数 GM (m³/s²) */
const GM = 3.986_004_418e14;

export interface OrbitalElements {
  /** NORAD カタログ番号 */
  noradId: string;
  /** 国際識別子 (COSPAR ID) */
  intlDesignator: string;
  /** 元期 (UTC) */
  epoch: Date;
  /** 軌道傾斜角 (degrees) */
  inclinationDeg: number;
  /** 離心率 */
  eccentricity: number;
  /** 軌道周期 (minutes) */
  periodMin: number;
  /** 概算高度 (km) */
  altitudeKm: number;
}

export interface RealtimePosition {
  /** 緯度 (degrees) */
  latDeg: number;
  /** 経度 (degrees) */
  lonDeg: number;
  /** 高度 (km) */
  altKm: number;
  /** 速度 (km/s) */
  speedKmS: number;
}

/**
 * TLEから静的な軌道要素を抽出する（1回のみ計算）
 */
export function extractOrbitalElements(tle1: string, tle2: string): OrbitalElements {
  const satrec = twoline2satrec(tle1, tle2);

  // NORAD ID
  const noradId = satrec.satnum;

  // 国際識別子: TLE line1 の列 9–16（0-indexed）
  const intlDesignator = tle1.slice(9, 17).trim();

  // 元期: epochyr (2桁年) + epochdays (通算日) → Date
  const yr = satrec.epochyr;
  const fullYear = yr < 57 ? 2000 + yr : 1900 + yr;
  const epochDate = new Date(Date.UTC(fullYear, 0, 1));
  epochDate.setUTCMilliseconds(
    epochDate.getUTCMilliseconds() + (satrec.epochdays - 1) * 86_400_000,
  );

  // 傾斜角: rad → degrees
  const inclinationDeg = satrec.inclo * (180 / Math.PI);

  // 離心率
  const eccentricity = satrec.ecco;

  // 平均運動: rad/min → rad/s
  const noRadS = satrec.no / 60;

  // 半長径: a = (GM / n²)^(1/3) in meters
  const semiMajorAxisM = Math.cbrt(GM / (noRadS * noRadS));

  // 軌道周期: T = 2π / n_rad_s (s) → minutes
  const periodMin = (2 * Math.PI) / noRadS / 60;

  // 概算高度: a - R_earth, km単位
  const altitudeKm = (semiMajorAxisM - R_EARTH_M) / 1000;

  return {
    noradId,
    intlDesignator,
    epoch: epochDate,
    inclinationDeg,
    eccentricity,
    periodMin,
    altitudeKm,
  };
}

/**
 * 指定時刻の衛星のリアルタイム位置・速度を計算する
 * 伝播失敗時は null を返す
 */
export function computeRealtimePosition(
  tle1: string,
  tle2: string,
  date: Date,
): RealtimePosition | null {
  const satrec = twoline2satrec(tle1, tle2);
  const posVel = propagate(satrec, date);

  if (!posVel || typeof posVel.position === "boolean" || !posVel.position) return null;
  if (!posVel.velocity || typeof posVel.velocity === "boolean") return null;

  const gmst = gstime(date);
  const geo = eciToGeodetic(posVel.position as EciVec3<Kilometer>, gmst);

  const latDeg = degreesLat(geo.latitude);
  const lonDeg = degreesLong(geo.longitude);
  const altKm = geo.height;

  const vel = posVel.velocity as EciVec3<Kilometer>;
  const speedKmS = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);

  return { latDeg, lonDeg, altKm, speedKmS };
}
