import { type ReactNode, useEffect, useRef } from "react";
import { Viewer, useCesium } from "resium";
import { Credit, CreditDisplay, ImageryLayer, type Viewer as CesiumViewer } from "cesium";
import { perfMetricsStore } from "../../lib/perf/perf-metrics-store";

const STEP_SEC_DEBOUNCE_MS = 1000;

/** カメラ高度（m）から stepSec を決定する */
export function getStepSecForHeight(heightM: number): number {
  if (heightM < 5_000_000) return 30;
  if (heightM < 20_000_000) return 60;
  return 120;
}

interface Props {
  showNightShade: boolean;
  onStepSecChange?: (stepSec: number) => void;
  children?: ReactNode;
}

CreditDisplay.cesiumCredit = new Credit(
  '<a href="https://cesium.com/platform/cesiumjs/" target="_blank" rel="noopener noreferrer">CesiumJS</a>',
  true,
);

declare global {
  interface Window {
    __CESIUM_VIEWER__?: CesiumViewer;
  }
}

/** Cesium Viewer を window に露出させるためのヘルパーコンポーネント */
function ViewerExposer() {
  const { viewer } = useCesium();
  useEffect(() => {
    if (viewer) window.__CESIUM_VIEWER__ = viewer;
  }, [viewer]);
  return null;
}

function FpsMonitor() {
  const { viewer } = useCesium();
  const frameCountRef = useRef(0);
  const windowStartRef = useRef(0);

  useEffect(() => {
    if (!viewer) return;
    if (import.meta.env.VITE_PERF_LOG !== "true") return;

    windowStartRef.current = performance.now();
    frameCountRef.current = 0;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      frameCountRef.current += 1;
      const now = performance.now();
      const elapsedMs = now - windowStartRef.current;
      if (elapsedMs < 1000) return;

      const fps = frameCountRef.current / (elapsedMs / 1000);
      perfMetricsStore.push({
        label: "fps",
        durationMs: fps,
        timestamp: now,
      });

      windowStartRef.current = now;
      frameCountRef.current = 0;
    });

    return () => {
      removeListener();
    };
  }, [viewer]);

  return null;
}

function StepSecController({ onStepSecChange }: { onStepSecChange: (stepSec: number) => void }) {
  const { viewer } = useCesium();
  const lastChangedAtRef = useRef(0);
  const currentStepSecRef = useRef(30);

  useEffect(() => {
    if (!viewer) return;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const height = viewer.camera.positionCartographic.height;
      const newStepSec = getStepSecForHeight(height);

      if (newStepSec === currentStepSecRef.current) return;

      const now = performance.now();
      if (now - lastChangedAtRef.current < STEP_SEC_DEBOUNCE_MS) return;

      lastChangedAtRef.current = now;
      currentStepSecRef.current = newStepSec;
      onStepSecChange(newStepSec);
    });

    return () => {
      removeListener();
    };
  }, [viewer, onStepSecChange]);

  return null;
}

function NightShadeController({ showNightShade }: { showNightShade: boolean }) {
  const { viewer } = useCesium();

  useEffect(() => {
    if (!viewer) return;

    viewer.scene.globe.enableLighting = showNightShade;
    if (showNightShade) {
      viewer.scene.globe.dynamicAtmosphereLighting = true;
      viewer.scene.globe.dynamicAtmosphereLightingFromSun = true;
    }
  }, [viewer, showNightShade]);

  return null;
}

export function GlobeRenderer({ showNightShade, onStepSecChange, children }: Props) {
  return (
    <Viewer
      full
      animation={false}
      baseLayerPicker={false}
      baseLayer={false as unknown as ImageryLayer}
      fullscreenButton={false}
      geocoder={false}
      homeButton={false}
      infoBox={false}
      sceneModePicker={false}
      selectionIndicator={false}
      timeline={false}
      navigationHelpButton={false}
      navigationInstructionsInitiallyVisible={false}
    >
      <ViewerExposer />
      <FpsMonitor />
      <NightShadeController showNightShade={showNightShade} />
      {onStepSecChange && <StepSecController onStepSecChange={onStepSecChange} />}
      {children}
    </Viewer>
  );
}
