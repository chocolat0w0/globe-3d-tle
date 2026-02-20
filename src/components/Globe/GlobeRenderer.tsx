import { type ReactNode, useEffect } from "react";
import { Viewer, useCesium } from "resium";
import { ImageryLayer, type Viewer as CesiumViewer } from "cesium";

interface Props {
  children?: ReactNode;
}

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

export function GlobeRenderer({ children }: Props) {
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
      {children}
    </Viewer>
  );
}
