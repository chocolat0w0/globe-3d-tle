import { ImageryLayer } from "resium";
import { UrlTemplateImageryProvider } from "cesium";
import { useMemo } from "react";

const TILE_URL = "/tiles/{z}/{x}/{y}.png";
const TILE_CREDIT =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> | ' +
  '<a href="https://corp.tellusxdp.com/" target="_blank" rel="noopener noreferrer">© Tellus Inc.</a>';

export function BaseMapLayer() {
  const imageryProvider = useMemo(
    () =>
      new UrlTemplateImageryProvider({
        url: TILE_URL,
        credit: TILE_CREDIT,
      }),
    [],
  );

  return <ImageryLayer imageryProvider={imageryProvider} />;
}
