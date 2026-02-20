import { ImageryLayer } from "resium";
import { UrlTemplateImageryProvider } from "cesium";
import { useMemo } from "react";

const TILE_URL = "/tiles/{z}/{x}/{y}.png";

export function BaseMapLayer() {
  const imageryProvider = useMemo(
    () => new UrlTemplateImageryProvider({ url: TILE_URL }),
    [],
  );

  return <ImageryLayer imageryProvider={imageryProvider} />;
}
