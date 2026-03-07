import { useEffect, useMemo } from "react";
import { Cartesian3 } from "cesium";
import { useCesium } from "resium";
import { BaseMapLayer } from "../../components/Globe/BaseMapLayer";
import { GlobeRenderer } from "../../components/Globe/GlobeRenderer";
import {
  CUSTOM_SATELLITE_ID,
  computeCustomOrbitData,
  getFootprintFovDeg,
  type LaunchedCustomSatellite,
} from "../../lib/edu/custom-orbit";
import { WINDOW_MS } from "../../lib/time-window";
import type { EduSatellite } from "../hooks/useEduSatellites";
import { EduCustomFootprintLayer } from "./EduCustomFootprintLayer";
import { EduCustomSatelliteLayer } from "./EduCustomSatelliteLayer";
import { EduFootprintLayer } from "./EduFootprintLayer";
import { EduSatelliteLayer } from "./EduSatelliteLayer";
import { EduTimeController } from "./EduTimeController";
import { SearchAreaLayer } from "./SearchAreaLayer";

const INITIAL_DESTINATION = Cartesian3.fromDegrees(137, 35, 15_000_000);
const CUSTOM_ORBIT_COLOR = "#ff7a3d";

export interface EduSearchArea {
  lonDeg: number;
  latDeg: number;
  radiusKm: number;
  locationName: string;
}

interface EduGlobeProps {
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  launchedCustomSatellite: LaunchedCustomSatellite | null;
  customCameraMode: "detail" | "wide";
  dayStartMs: number;
  onWindowStartChange: (windowStartMs: number) => void;
  searchArea?: EduSearchArea | null;
}

function EduInitialCamera() {
  const { viewer } = useCesium();

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.setView({ destination: INITIAL_DESTINATION });

    const homeButton = viewer.homeButton?.viewModel;
    if (!homeButton) return;

    const removeListener = homeButton.command.beforeExecute.addEventListener(
      (commandInfo: { cancel: boolean }) => {
        commandInfo.cancel = true;
        viewer.camera.flyTo({
          destination: INITIAL_DESTINATION,
          duration: 1.1,
        });
      },
    );

    return () => {
      removeListener();
    };
  }, [viewer]);

  return null;
}

export function EduGlobe({
  satellites,
  selectedSatelliteId,
  launchedCustomSatellite,
  customCameraMode,
  dayStartMs,
  onWindowStartChange,
  searchArea,
}: EduGlobeProps) {
  const selectedExistingSatellite = useMemo(
    () => satellites.find((satellite) => satellite.id === selectedSatelliteId) ?? null,
    [satellites, selectedSatelliteId],
  );

  const customOrbitData = useMemo(() => {
    if (!launchedCustomSatellite) return null;
    return computeCustomOrbitData({
      altitudeKm: launchedCustomSatellite.altitudeKm,
      inclinationDeg: launchedCustomSatellite.inclinationDeg,
      launchEpochMs: launchedCustomSatellite.launchEpochMs,
      startMs: dayStartMs,
      durationMs: WINDOW_MS,
      stepSec: 30,
    });
  }, [dayStartMs, launchedCustomSatellite]);

  const customSelected = selectedSatelliteId === CUSTOM_SATELLITE_ID;
  const customPreviewFootprintFovDeg = getFootprintFovDeg(customCameraMode);

  return (
    <GlobeRenderer showNightShade={false} homeButton>
      <BaseMapLayer />
      <EduInitialCamera />

      {satellites.map((satellite) => (
        <EduSatelliteLayer
          key={satellite.id}
          id={satellite.id}
          displayName={satellite.displayName}
          tle={satellite.tle}
          color={satellite.orbitColor}
          selected={satellite.id === selectedSatelliteId}
          dayStartMs={dayStartMs}
          stepSec={30}
        />
      ))}

      {launchedCustomSatellite && customOrbitData && (
        <EduCustomSatelliteLayer
          id={CUSTOM_SATELLITE_ID}
          displayName="あなたの衛星"
          orbitData={customOrbitData}
          color={CUSTOM_ORBIT_COLOR}
          selected={customSelected}
        />
      )}

      {selectedExistingSatellite && (
        <EduFootprintLayer
          satelliteId={selectedExistingSatellite.id}
          tle1={selectedExistingSatellite.tle.line1}
          tle2={selectedExistingSatellite.tle.line2}
          color={selectedExistingSatellite.orbitColor}
          dayStartMs={dayStartMs}
          offnadirRanges={selectedExistingSatellite.offnadirRanges}
          stepSec={30}
        />
      )}

      {customSelected && launchedCustomSatellite && customOrbitData && (
        <EduCustomFootprintLayer
          orbitData={customOrbitData}
          color={CUSTOM_ORBIT_COLOR}
          altitudeKm={launchedCustomSatellite.altitudeKm}
          footprintFovDeg={customPreviewFootprintFovDeg}
        />
      )}

      {searchArea && (
        <SearchAreaLayer
          lonDeg={searchArea.lonDeg}
          latDeg={searchArea.latDeg}
          radiusKm={searchArea.radiusKm}
          locationName={searchArea.locationName}
        />
      )}

      <div className="edu-time-controller-shell">
        <EduTimeController onWindowStartChange={onWindowStartChange} />
      </div>
    </GlobeRenderer>
  );
}
