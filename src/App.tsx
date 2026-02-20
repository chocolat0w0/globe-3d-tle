import { GlobeRenderer } from "./components/Globe/GlobeRenderer";
import { BaseMapLayer } from "./components/Globe/BaseMapLayer";
import { InfoPanel } from "./components/HUD/InfoPanel";
import "./App.css";

function App() {
  return (
    <GlobeRenderer>
      <BaseMapLayer />
      <InfoPanel />
    </GlobeRenderer>
  );
}

export default App;
