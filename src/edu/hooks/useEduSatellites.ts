import { useCallback, useMemo, useState } from "react";
import rawTle from "../../data/sample-tle.json";
import {
  eduSatelliteMetadataMap,
  type EduSatelliteMetadata,
} from "../../data/edu-satellite-metadata";
import { JAPAN_POLYGONS } from "../../data/japan-polygon";
import {
  CUSTOM_SATELLITE_ID,
  buildLaunchedCustomSatellite,
  normalizeCustomDraft,
  type CameraMode,
  type CustomSatelliteDraft,
  type LaunchedCustomSatellite,
} from "../../lib/edu/custom-orbit";
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

const DEFAULT_CUSTOM_DRAFT: CustomSatelliteDraft = {
  altitudeKm: 700,
  inclinationDeg: 45,
  cameraMode: "detail",
};

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

export interface CustomSatelliteCardView {
  id: string;
  displayName: string;
  cardColor: string;
  orbitColor: string;
  altitudeKm: number;
  inclinationDeg: number;
  cameraMode: CameraMode;
  speedKmS: number | null;
  orbitsPerDay: number | null;
  japanPassesPerDay: number | null;
  launched: boolean;
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

function buildCustomCardView(
  draft: CustomSatelliteDraft,
  launched: LaunchedCustomSatellite | null,
): CustomSatelliteCardView {
  const source = launched ?? draft;
  return {
    id: CUSTOM_SATELLITE_ID,
    displayName: "あなたの衛星",
    cardColor: "#ffb25e",
    orbitColor: "#ff7a3d",
    altitudeKm: source.altitudeKm,
    inclinationDeg: source.inclinationDeg,
    cameraMode: source.cameraMode,
    speedKmS: launched ? launched.speedKmS : null,
    orbitsPerDay: launched ? launched.orbitsPerDay : null,
    japanPassesPerDay: launched ? launched.japanPassesPerDay : null,
    launched: launched !== null,
  };
}

interface UseEduSatellitesResult {
  satellites: EduSatellite[];
  customSatellite: CustomSatelliteCardView;
  customDraft: CustomSatelliteDraft;
  launchedCustomSatellite: LaunchedCustomSatellite | null;
  selectedSatelliteId: string | null;
  selectionNonce: number;
  selectedSatellite: EduSatellite | null;
  detailSatellite: EduSatellite | null;
  customDetailOpen: boolean;
  selectSatellite: (id: string) => void;
  openDetails: (id: string) => void;
  closeDetails: () => void;
  updateDraft: (patch: Partial<CustomSatelliteDraft>) => void;
  launchCustomSatellite: () => void;
}

export function useEduSatellites(): UseEduSatellitesResult {
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(null);
  const [selectionNonce, setSelectionNonce] = useState(0);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [customDraft, setCustomDraft] = useState<CustomSatelliteDraft>(DEFAULT_CUSTOM_DRAFT);
  const [launchedCustomSatellite, setLaunchedCustomSatellite] =
    useState<LaunchedCustomSatellite | null>(null);

  const selectedSatellite = useMemo(
    () => EDU_SATELLITES.find((satellite) => satellite.id === selectedSatelliteId) ?? null,
    [selectedSatelliteId],
  );

  const detailSatellite = useMemo(
    () => EDU_SATELLITES.find((satellite) => satellite.id === detailTargetId) ?? null,
    [detailTargetId],
  );

  const customSatellite = useMemo(
    () => buildCustomCardView(customDraft, launchedCustomSatellite),
    [customDraft, launchedCustomSatellite],
  );

  const selectSatellite = useCallback((id: string) => {
    setSelectedSatelliteId(id);
    setSelectionNonce((previous) => previous + 1);
  }, []);

  const openDetails = useCallback((id: string) => {
    setSelectedSatelliteId(id);
    setDetailTargetId(id);
    setSelectionNonce((previous) => previous + 1);
  }, []);

  const closeDetails = useCallback(() => {
    setDetailTargetId(null);
  }, []);

  const updateDraft = useCallback((patch: Partial<CustomSatelliteDraft>) => {
    setCustomDraft((previous) => {
      const next: CustomSatelliteDraft = {
        altitudeKm: patch.altitudeKm ?? previous.altitudeKm,
        inclinationDeg: patch.inclinationDeg ?? previous.inclinationDeg,
        cameraMode: patch.cameraMode ?? previous.cameraMode,
      };
      return normalizeCustomDraft(next);
    });
  }, []);

  const launchCustomSatellite = useCallback(() => {
    const launchEpochMs = Date.now();
    const launched = buildLaunchedCustomSatellite(customDraft, launchEpochMs, JAPAN_POLYGONS);
    setLaunchedCustomSatellite(launched);
    setSelectedSatelliteId(CUSTOM_SATELLITE_ID);
    setSelectionNonce((previous) => previous + 1);
  }, [customDraft]);

  return {
    satellites: EDU_SATELLITES,
    customSatellite,
    customDraft,
    launchedCustomSatellite,
    selectedSatelliteId,
    selectionNonce,
    selectedSatellite,
    detailSatellite,
    customDetailOpen: detailTargetId === CUSTOM_SATELLITE_ID,
    selectSatellite,
    openDetails,
    closeDetails,
    updateDraft,
    launchCustomSatellite,
  };
}
