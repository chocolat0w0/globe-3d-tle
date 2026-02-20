import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { SatelliteLayer } from "./components/Globe/SatelliteLayer";
import { InfoPanel } from "./components/HUD/InfoPanel";
import sampleTle from "./data/sample-tle.json";
import "./App.css";

// Phase 3: 1機（ISS）で動作確認
const ISS = sampleTle[0];

function App() {
  return (
    <GlobeRenderer>
      <BaseMapLayer />
      <SatelliteLayer
        id={ISS.id}
        name={ISS.name}
        tle={ISS.tle}
        color={ISS.color}
      />
      <InfoPanel />
    </GlobeRenderer>
  );
}

export default App;
