import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { SatelliteList } from "./components/SatelliteList/SatelliteList";
import { InfoPanel } from "./components/HUD/InfoPanel";
import { useSatellites } from "./hooks/useSatellites";
import "./App.css";

function App() {
  const { satellites, toggleVisible, selectSatellite } = useSatellites();

  return (
    <GlobeRenderer>
      <BaseMapLayer />
      {satellites.map((sat, idx) => (
        <SatelliteLayer
          key={sat.id}
          id={sat.id}
          name={sat.name}
          tle={sat.tle}
          color={sat.color}
          visible={sat.visible}
          selected={sat.selected}
          initializeClock={idx === 0}
        />
      ))}
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
