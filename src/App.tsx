import { useState } from "react";
import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { FootprintLayer } from "./components/Globe/FootprintLayer";
import { SwathLayer } from "./components/Globe/SwathLayer";
import { TimeController } from "./components/TimeController/TimeController";
import { SatelliteList } from "./components/SatelliteList/SatelliteList";
import { InfoPanel } from "./components/HUD/InfoPanel";
import { useSatellites } from "./hooks/useSatellites";
import type { OrbitRenderMode } from "./types/orbit";
import "./App.css";

function getDayStartMs(now: number): number {
  return now - (now % 86400000);
}

function App() {
  const { satellites, toggleVisible, selectSatellite, toggleFootprint, toggleSwath } = useSatellites();
  const [dayStartMs, setDayStartMs] = useState(() => getDayStartMs(Date.now()));
  const [orbitRenderMode, setOrbitRenderMode] = useState<OrbitRenderMode>("geodesic");

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
      <TimeController onDayChange={setDayStartMs} />
      <InfoPanel orbitRenderMode={orbitRenderMode} onOrbitRenderModeChange={setOrbitRenderMode} />
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
