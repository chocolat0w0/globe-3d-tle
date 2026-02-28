import { useCesium } from "resium";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import * as Cesium from "cesium";
import type { OrbitRenderMode } from "../../types/orbit";

const HOME_DESTINATION = Cesium.Cartesian3.fromDegrees(0, 20, 20_000_000);
const HOME_FLIGHT_DURATION_SECONDS = 1.5;

interface CameraPos {
  lat: number;
  lon: number;
  alt: number;
}

interface InfoPanelProps {
  orbitRenderMode: OrbitRenderMode;
  onOrbitRenderModeChange: (mode: OrbitRenderMode) => void;
  showNightShade: boolean;
  onNightShadeToggle: () => void;
  onGoHome: () => void;
}

export function InfoPanel({
  orbitRenderMode,
  onOrbitRenderModeChange,
  showNightShade,
  onNightShadeToggle,
  onGoHome,
}: InfoPanelProps) {
  const { viewer } = useCesium();
  const [pos, setPos] = useState<CameraPos>({ lat: 0, lon: 0, alt: 0 });
  const prevRef = useRef("");

  const handleGoHome = useCallback(() => {
    if (!viewer) return;
    // flushSync で React の deselect 更新を同期的に処理し、
    // SatelliteLayer の trackedEntity クリアとリスナー解除が flyTo 前に完了することを保証する
    flushSync(() => {
      onGoHome();
    });
    viewer.camera.flyTo({
      destination: HOME_DESTINATION,
      duration: HOME_FLIGHT_DURATION_SECONDS,
    });
  }, [viewer, onGoHome]);

  useEffect(() => {
    if (!viewer) return;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const carto = viewer.camera.positionCartographic;
      const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(4);
      const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(4);
      const alt = (carto.height / 1000).toFixed(1);
      const key = `${lat},${lon},${alt}`;

      if (key !== prevRef.current) {
        prevRef.current = key;
        setPos({ lat: Number(lat), lon: Number(lon), alt: Number(alt) });
      }
    });

    return () => {
      removeListener();
    };
  }, [viewer]);

  return (
    <div className="ui-panel info-panel">
      <div className="info-panel-header">
        <div className="ui-panel-title">Flight View</div>
        <div className="ui-panel-subtitle">Orbital Display</div>
      </div>

      <div className="info-section">
        <div className="ui-section-label">軌道表示</div>
        <div className="ui-segment-group">
          <button
            type="button"
            onClick={() => onOrbitRenderModeChange("geodesic")}
            aria-pressed={orbitRenderMode === "geodesic"}
            className={`ui-button ${orbitRenderMode === "geodesic" ? "is-active" : ""}`.trim()}
          >
            Geodesic
          </button>
          <button
            type="button"
            onClick={() => onOrbitRenderModeChange("cartesian")}
            aria-pressed={orbitRenderMode === "cartesian"}
            className={`ui-button ${orbitRenderMode === "cartesian" ? "is-active" : ""}`.trim()}
          >
            Cartesian
          </button>
        </div>
      </div>

      <div className="info-section">
        <div className="ui-section-label">表示</div>
        <button
          type="button"
          onClick={onNightShadeToggle}
          aria-pressed={showNightShade}
          className={`ui-button ${showNightShade ? "is-active" : ""}`.trim()}
        >
          Night Shade
        </button>
      </div>

      <div className="info-section">
        <div className="ui-section-label">カメラ</div>
        <button
          type="button"
          onClick={handleGoHome}
          className="ui-button"
        >
          Home
        </button>
      </div>

      <div className="camera-readout">
        <div className="camera-readout-row">
          <span className="camera-readout-label">緯度</span>
          <span>{pos.lat}°</span>
        </div>
        <div className="camera-readout-row">
          <span className="camera-readout-label">経度</span>
          <span>{pos.lon}°</span>
        </div>
        <div className="camera-readout-row">
          <span className="camera-readout-label">高度</span>
          <span>{pos.alt} km</span>
        </div>
      </div>
    </div>
  );
}
