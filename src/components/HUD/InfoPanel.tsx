import { useCesium } from "resium";
import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import type { OrbitRenderMode } from "../../types/orbit";

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
}

export function InfoPanel({
  orbitRenderMode,
  onOrbitRenderModeChange,
  showNightShade,
  onNightShadeToggle,
}: InfoPanelProps) {
  const { viewer } = useCesium();
  const [pos, setPos] = useState<CameraPos>({ lat: 0, lon: 0, alt: 0 });
  const prevRef = useRef("");

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
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(0, 0, 0, 0.65)",
        color: "#e8e8e8",
        padding: "8px 12px",
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "monospace",
        lineHeight: 1.8,
        zIndex: 10,
        pointerEvents: "auto",
        userSelect: "none",
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <div style={{ marginBottom: 2 }}>軌道表示</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            onClick={() => onOrbitRenderModeChange("geodesic")}
            aria-pressed={orbitRenderMode === "geodesic"}
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 4,
              color: "#e8e8e8",
              background:
                orbitRenderMode === "geodesic"
                  ? "rgba(100,180,255,0.35)"
                  : "rgba(255,255,255,0.1)",
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          >
            Geodesic
          </button>
          <button
            type="button"
            onClick={() => onOrbitRenderModeChange("cartesian")}
            aria-pressed={orbitRenderMode === "cartesian"}
            style={{
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 4,
              color: "#e8e8e8",
              background:
                orbitRenderMode === "cartesian"
                  ? "rgba(100,180,255,0.35)"
                  : "rgba(255,255,255,0.1)",
              padding: "2px 8px",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          >
            Cartesian
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 6 }}>
        <div style={{ marginBottom: 2 }}>表示</div>
        <button
          type="button"
          onClick={onNightShadeToggle}
          aria-pressed={showNightShade}
          style={{
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 4,
            color: "#e8e8e8",
            background: showNightShade ? "rgba(100,180,255,0.35)" : "rgba(255,255,255,0.1)",
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          Night Shade
        </button>
      </div>
      <div>緯度: {pos.lat}°</div>
      <div>経度: {pos.lon}°</div>
      <div>高度: {pos.alt} km</div>
    </div>
  );
}
