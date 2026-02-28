import { useState } from "react";
import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { FootprintLayer } from "./components/Globe/FootprintLayer";
import { SwathLayer } from "./components/Globe/SwathLayer";
import { AoiLayer } from "./components/Globe/AoiLayer";
import { TimeController } from "./components/TimeController/TimeController";
import { SatelliteList } from "./components/SatelliteList/SatelliteList";
import { SatelliteDetailPanel } from "./components/SatelliteList/SatelliteDetailPanel";
import { InfoPanel } from "./components/HUD/InfoPanel";
import { PerfOverlay } from "./components/HUD/PerfOverlay";
import { AoiPanel } from "./components/AOI/AoiPanel";
import { useSatellites } from "./hooks/useSatellites";
import { useAoi } from "./hooks/useAoi";
import type { OrbitRenderMode } from "./types/orbit";
import "./App.css";

const WINDOW_MS = 4 * 3600 * 1000; // 4時間窓

function getWindowStartMs(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function App() {
  const { satellites, toggleVisible, selectSatellite, toggleFootprint, toggleSwath } =
    useSatellites();
  const [detailSatelliteId, setDetailSatelliteId] = useState<string | null>(null);
  const detailSatellite = satellites.find((s) => s.id === detailSatelliteId) ?? null;
  const [windowStartMs, setWindowStartMs] = useState(() => getWindowStartMs(Date.now()));
  const [orbitRenderMode, setOrbitRenderMode] = useState<OrbitRenderMode>("cartesian");
  const [showNightShade, setShowNightShade] = useState(false);
  const [stepSec, setStepSec] = useState(5);
  const { aoi, mode: aoiMode, setMode: setAoiMode, setAoi, clearAoi, loadFromGeoJSON } = useAoi();

  return (
    <GlobeRenderer showNightShade={showNightShade} onStepSecChange={setStepSec}>
      <div className="cosmic-veil cosmic-veil--north" aria-hidden="true" />
      <div className="cosmic-veil cosmic-veil--south" aria-hidden="true" />
      <div className="cosmic-grid" aria-hidden="true" />
      <BaseMapLayer />
      {satellites.map((sat) => (
        <SatelliteLayer
          key={sat.id}
          id={sat.id}
          name={sat.name}
          tle={sat.tle}
          color={sat.color}
          visible={sat.visible}
          selected={sat.selected}
          dayStartMs={windowStartMs}
          orbitRenderMode={orbitRenderMode}
          stepSec={stepSec}
        />
      ))}
      {satellites.map((sat) => (
        <FootprintLayer
          key={`fp-${sat.id}`}
          id={sat.id}
          tle={sat.tle}
          color={sat.color}
          visible={sat.visible}
          showFootprint={sat.showFootprint}
          dayStartMs={windowStartMs}
          offnadirRanges={sat.offnadirRanges}
          stepSec={stepSec}
        />
      ))}
      {satellites.map((sat) => (
        <SwathLayer
          key={`sw-${sat.id}`}
          id={sat.id}
          tle={sat.tle}
          color={sat.color}
          visible={sat.visible}
          showSwath={sat.showSwath}
          dayStartMs={windowStartMs}
          offnadirRanges={sat.offnadirRanges}
        />
      ))}
      <AoiLayer aoi={aoi} mode={aoiMode} onAoiChange={setAoi} />
      <TimeController onDayChange={setWindowStartMs} aoiDrawing={aoiMode !== "none"} />
      <div className="right-panel-stack">
        <InfoPanel
          orbitRenderMode={orbitRenderMode}
          onOrbitRenderModeChange={setOrbitRenderMode}
          showNightShade={showNightShade}
          onNightShadeToggle={() => setShowNightShade((prev) => !prev)}
        />
        <AoiPanel
          mode={aoiMode}
          aoi={aoi}
          onSetMode={setAoiMode}
          onClear={clearAoi}
          onLoadGeoJSON={loadFromGeoJSON}
        />
      </div>
      <PerfOverlay />
      <div className="satellite-panel-stack">
        <SatelliteList
          satellites={satellites}
          onToggleVisible={toggleVisible}
          onSelect={selectSatellite}
          onToggleFootprint={toggleFootprint}
          onToggleSwath={toggleSwath}
          onShowDetail={setDetailSatelliteId}
        />
        {detailSatellite !== null && (
          <SatelliteDetailPanel
            satellite={detailSatellite}
            onClose={() => setDetailSatelliteId(null)}
          />
        )}
      </div>
    </GlobeRenderer>
  );
}

export default App;
