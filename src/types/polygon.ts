export interface AoiPoint {
  type: "Point";
  coordinate: [lon: number, lat: number]; // degrees
}

export interface AoiPolygon {
  type: "Polygon";
  coordinates: [lon: number, lat: number][]; // degrees, GeoJSON準拠
}

export type Aoi = AoiPoint | AoiPolygon;

export type AoiDrawingMode = "point" | "polygon" | "none";

export interface FlatRings {
  rings: ArrayBuffer; // Float32Array [lon,lat,...]
  offsets: ArrayBuffer; // Int32Array
  counts: ArrayBuffer; // Int32Array
}
