import { useCesium } from "resium";
import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

interface CameraPos {
  lat: number;
  lon: number;
  alt: number;
}

export function InfoPanel() {
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
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div>緯度: {pos.lat}°</div>
      <div>経度: {pos.lon}°</div>
      <div>高度: {pos.alt} km</div>
    </div>
  );
}
