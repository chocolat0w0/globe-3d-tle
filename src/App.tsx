import { useCallback, useEffect, useRef, useState } from "react";
import { useCesium } from "resium";
import { Cartesian3, JulianDate } from "cesium";
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

type ScreenshotPhase = "idle" | "capture" | "restore";

interface SavedCameraState {
  position: Cartesian3;
  direction: Cartesian3;
  up: Cartesian3;
  currentTime: JulianDate;
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

interface ScreenshotControllerProps {
  phase: ScreenshotPhase;
  savedState: SavedCameraState;
  onCaptureDone: () => void;
  onRestoreDone: () => void;
}

function ScreenshotController({ phase, savedState, onCaptureDone, onRestoreDone }: ScreenshotControllerProps) {
  const { viewer } = useCesium();
  const didActRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!viewer || didActRef.current) return;
    didActRef.current = true;

    // Viewer 再マウント後にカメラ・時刻を復元
    viewer.camera.setView({
      destination: savedState.position,
      orientation: {
        direction: savedState.direction,
        up: savedState.up,
      },
    });
    viewer.clock.currentTime = savedState.currentTime.clone();

    if (phase === "restore") {
      onRestoreDone();
      return;
    }

    // capture フェーズ: 2フレーム描画を待ってからキャプチャ
    let frameCount = 0;
    const removeListener = viewer.scene.postRender.addEventListener(() => {
      if (viewer.isDestroyed()) return;
      frameCount += 1;
      if (frameCount < 2) return;
      removeListener();

      viewer.scene.canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `globe-${formatTimestamp(new Date())}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        if (isMountedRef.current) onCaptureDone();
      }, "image/png");
    });

    return () => {
      if (!viewer.isDestroyed()) removeListener();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  return null;
}

const WINDOW_MS = 4 * 3600 * 1000; // 4時間窓

function getWindowStartMs(now: number): number {
  return Math.floor(now / WINDOW_MS) * WINDOW_MS;
}

function App() {
  const { satellites, toggleVisible, selectSatellite, deselectAll, toggleFootprint, toggleSwath, updateOffnadirRanges } =
    useSatellites();
  const selectedSatellite = satellites.find((s) => s.selected) ?? null;
  const [detailSatelliteId, setDetailSatelliteId] = useState<string | null>(null);
  const detailSatellite = satellites.find((s) => s.id === detailSatelliteId) ?? null;
  const [windowStartMs, setWindowStartMs] = useState(() => getWindowStartMs(Date.now()));
  const [orbitRenderMode, setOrbitRenderMode] = useState<OrbitRenderMode>("cartesian");
  const [showNightShade, setShowNightShade] = useState(false);
  const [stepSec, setStepSec] = useState(5);
  const { aoi, mode: aoiMode, setMode: setAoiMode, setAoi, clearAoi, loadFromGeoJSON } = useAoi();

  const [screenshotPhase, setScreenshotPhase] = useState<ScreenshotPhase>("idle");
  const [screenshotKey, setScreenshotKey] = useState(0);
  const savedStateRef = useRef<SavedCameraState | null>(null);

  const handleScreenshot = useCallback(() => {
    const cesiumViewer = window.__CESIUM_VIEWER__;
    if (!cesiumViewer) return;
    savedStateRef.current = {
      position: cesiumViewer.camera.position.clone(),
      direction: cesiumViewer.camera.direction.clone(),
      up: cesiumViewer.camera.up.clone(),
      currentTime: cesiumViewer.clock.currentTime.clone(),
    };
    setScreenshotPhase("capture");
    setScreenshotKey((k) => k + 1);
  }, []);

  const handleCaptureDone = useCallback(() => {
    setScreenshotPhase("restore");
    setScreenshotKey((k) => k + 1);
  }, []);

  const handleRestoreDone = useCallback(() => {
    setScreenshotPhase("idle");
  }, []);

  return (
    <GlobeRenderer
      key={screenshotKey}
      preserveDrawingBuffer={screenshotPhase === "capture"}
      showNightShade={showNightShade}
      onStepSecChange={setStepSec}
    >
      {screenshotPhase !== "idle" && savedStateRef.current && (
        <ScreenshotController
          phase={screenshotPhase}
          savedState={savedStateRef.current}
          onCaptureDone={handleCaptureDone}
          onRestoreDone={handleRestoreDone}
        />
      )}
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
          onGoHome={deselectAll}
          selectedSatelliteTle={selectedSatellite?.tle}
          onScreenshot={handleScreenshot}
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
            onUpdateOffnadirRanges={(ranges) => updateOffnadirRanges(detailSatellite.id, ranges)}
          />
        )}
      </div>
    </GlobeRenderer>
  );
}

export default App;
