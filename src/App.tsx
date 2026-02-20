import { useState } from "react";
import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { TimeController } from "./components/TimeController/TimeController";
import { SatelliteList } from "./components/SatelliteList/SatelliteList";
import { InfoPanel } from "./components/HUD/InfoPanel";
import { useSatellites } from "./hooks/useSatellites";
import "./App.css";

function getDayStartMs(now: number): number {
  return now - (now % 86400000);
}

function App() {
  const { satellites, toggleVisible, selectSatellite } = useSatellites();
  const [dayStartMs, setDayStartMs] = useState(() => getDayStartMs(Date.now()));

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
        />
      ))}
      <TimeController onDayChange={setDayStartMs} />
      <InfoPanel />
      <SatelliteList
        satellites={satellites}
        onToggleVisible={toggleVisible}
        onSelect={selectSatellite}
      />
    </GlobeRenderer>
  );
}

export default App;
