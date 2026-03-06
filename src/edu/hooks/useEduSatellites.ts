import { useCallback, useMemo, useState } from "react";
import rawTle from "../../data/sample-tle.json";
import {
  eduSatelliteMetadataMap,
  type EduSatelliteMetadata,
} from "../../data/edu-satellite-metadata";
import { extractOrbitalElements } from "../../lib/tle/orbital-elements";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";
import type { TLEData } from "../../types/satellite";

type TleEntry = {
  id: string;
  name: string;
  catalogNumber?: number;
  tle: TLEData;
  offnadirRanges: number[][];
  color: string;
};

const tleEntries = rawTle satisfies TleEntry[];

const EARTH_RADIUS_KM = 6371;
const SHINKANSEN_SPEED_KM_S = 0.089;

export interface EduSatellite extends EduSatelliteMetadata {
  name: string;
  catalogNumber?: number;
  tle: TLEData;
  orbitColor: string;
  offnadirRanges: OffnadirRange[];
  orbitalPeriodMin: number;
  inclinationDeg: number;
  speedKmS: number;
  speedComparison: string;
}

function buildEduSatellites(): EduSatellite[] {
  return tleEntries.map((entry) => {
    const metadata = eduSatelliteMetadataMap[entry.id];
    if (!metadata) {
      throw new Error(`教育メタデータが見つかりません: ${entry.id}`);
    }

    const orbitalElements = extractOrbitalElements(entry.tle.line1, entry.tle.line2);
    const orbitalCircumferenceKm = 2 * Math.PI * (EARTH_RADIUS_KM + metadata.altitude.km);
    const speedKmS = orbitalCircumferenceKm / (orbitalElements.periodMin * 60);
    const speedRatio = Math.max(1, Math.round(speedKmS / SHINKANSEN_SPEED_KM_S));

    return {
      ...metadata,
      name: entry.name,
      catalogNumber: entry.catalogNumber,
      tle: entry.tle,
      orbitColor: entry.color,
      offnadirRanges: entry.offnadirRanges.map(
        ([minDeg, maxDeg]) => [minDeg, maxDeg] as OffnadirRange,
      ),
      orbitalPeriodMin: orbitalElements.periodMin,
      inclinationDeg: orbitalElements.inclinationDeg,
      speedKmS,
      speedComparison: `新幹線の約${speedRatio.toLocaleString("ja-JP")}倍`,
    };
  });
}

const EDU_SATELLITES = buildEduSatellites();

interface UseEduSatellitesResult {
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  selectedSatellite: EduSatellite | null;
  detailSatellite: EduSatellite | null;
  selectSatellite: (id: string) => void;
  openDetails: (id: string) => void;
  closeDetails: () => void;
}

export function useEduSatellites(): UseEduSatellitesResult {
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [detailSatelliteId, setDetailSatelliteId] = useState<string | null>(null);

  const selectedSatellite = useMemo(
    () => EDU_SATELLITES.find((satellite) => satellite.id === selectedSatelliteId) ?? null,
    [selectedSatelliteId],
  );

  const detailSatellite = useMemo(
    () => EDU_SATELLITES.find((satellite) => satellite.id === detailSatelliteId) ?? null,
    [detailSatelliteId],
  );

  const selectSatellite = useCallback((id: string) => {
    setSelectedSatelliteId(id);
  }, []);

  const openDetails = useCallback((id: string) => {
    setSelectedSatelliteId(id);
    setDetailSatelliteId(id);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailSatelliteId(null);
  }, []);

  return {
    satellites: EDU_SATELLITES,
    selectedSatelliteId,
    selectedSatellite,
    detailSatellite,
    selectSatellite,
    openDetails,
    closeDetails,
  };
}
