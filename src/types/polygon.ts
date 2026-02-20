export type PolygonState = "default" | "hover" | "selected";

export interface AOIPolygon {
  id: string;
  name: string;
  coordinates: number[][][]; // GeoJSON Polygon coordinates
  state: PolygonState;
}

export interface FlatRings {
  rings: ArrayBuffer; // Float32Array [lon,lat,...]
  offsets: ArrayBuffer; // Int32Array
  counts: ArrayBuffer; // Int32Array
}
