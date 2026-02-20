import { type ReactNode } from "react";
import { Viewer } from "resium";
import { ImageryLayer } from "cesium";

interface Props {
  children?: ReactNode;
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
      {children}
    </Viewer>
  );
}
