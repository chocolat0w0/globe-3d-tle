import { useState } from "react";
import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { FootprintLayer } from "./components/Globe/FootprintLayer";
import { SwathLayer } from "./components/Globe/SwathLayer";
import { AoiLayer } from "./components/Globe/AoiLayer";
import { TimeController } from "./components/TimeController/TimeController";
import { SatelliteList } from "./components/SatelliteList/SatelliteList";
import { InfoPanel } from "./components/HUD/InfoPanel";
import { PerfOverlay } from "./components/HUD/PerfOverlay";
import { AoiPanel } from "./components/AOI/AoiPanel";
import { useSatellites } from "./hooks/useSatellites";
import { useAoi } from "./hooks/useAoi";
import type { OrbitRenderMode } from "./types/orbit";
import "./App.css";

function getDayStartMs(now: number): number {
  return now - (now % 86400000);
}

function App() {
  const { satellites, toggleVisible, selectSatellite, toggleFootprint, toggleSwath } = useSatellites();
  const [dayStartMs, setDayStartMs] = useState(() => getDayStartMs(Date.now()));
  const [orbitRenderMode, setOrbitRenderMode] = useState<OrbitRenderMode>("geodesic");
  const { aoi, mode: aoiMode, setMode: setAoiMode, setAoi, clearAoi, loadFromGeoJSON } = useAoi();

  return (
    <GlobeRenderer>
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
          dayStartMs={dayStartMs}
          orbitRenderMode={orbitRenderMode}
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
          dayStartMs={dayStartMs}
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
          dayStartMs={dayStartMs}
        />
      ))}
      <AoiLayer aoi={aoi} mode={aoiMode} onAoiChange={setAoi} />
      <TimeController onDayChange={setDayStartMs} aoiDrawing={aoiMode !== "none"} />
      <InfoPanel orbitRenderMode={orbitRenderMode} onOrbitRenderModeChange={setOrbitRenderMode} />
      <PerfOverlay />
      <AoiPanel
        mode={aoiMode}
        aoi={aoi}
        onSetMode={setAoiMode}
        onClear={clearAoi}
        onLoadGeoJSON={loadFromGeoJSON}
      />
      <SatelliteList
        satellites={satellites}
        onToggleVisible={toggleVisible}
        onSelect={selectSatellite}
        onToggleFootprint={toggleFootprint}
        onToggleSwath={toggleSwath}
      />
    </GlobeRenderer>
  );
}

export default App;
