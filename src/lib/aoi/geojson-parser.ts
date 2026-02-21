import type { Aoi, AoiPoint, AoiPolygon } from "../../types/polygon";

type ParseResult =
  | { success: true; aoi: Aoi }
  | { success: false; error: string };

function parsePoint(coords: unknown): AoiPoint | null {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lon, lat] = coords as number[];
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  return { type: "Point", coordinate: [lon, lat] };
}

function parsePolygon(coords: unknown): AoiPolygon | null {
  if (!Array.isArray(coords) || coords.length === 0) return null;
  const ring = coords[0]; // 外輪のみ
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const coordinates = ring.map((pt: unknown) => {
    if (!Array.isArray(pt) || pt.length < 2) return null;
    const [lon, lat] = pt as number[];
    if (typeof lon !== "number" || typeof lat !== "number") return null;
    return [lon, lat] as [number, number];
  });
  if (coordinates.some((c) => c === null)) return null;
  return {
    type: "Polygon",
    coordinates: coordinates as [number, number][],
  };
}

function parseGeometry(geometry: Record<string, unknown>): Aoi | null {
  if (geometry.type === "Point") {
    return parsePoint(geometry.coordinates);
  }
  if (geometry.type === "Polygon") {
    return parsePolygon(geometry.coordinates);
  }
  return null;
}

export function parseAoiFromGeoJSON(json: unknown): ParseResult {
  try {
    if (typeof json !== "object" || json === null) {
      return { success: false, error: "無効なJSONです" };
    }

    const obj = json as Record<string, unknown>;

    // FeatureCollection: 最初の Feature を採用
    if (obj.type === "FeatureCollection") {
      const features = obj.features;
      if (!Array.isArray(features) || features.length === 0) {
        return { success: false, error: "FeatureCollection にフィーチャが含まれていません" };
      }
      return parseAoiFromGeoJSON(features[0]);
    }

    // Feature
    if (obj.type === "Feature") {
      const geometry = obj.geometry as Record<string, unknown> | null;
      if (!geometry) {
        return { success: false, error: "geometry が null です" };
      }
      const aoi = parseGeometry(geometry);
      if (!aoi) {
        return {
          success: false,
          error: `非対応の geometry タイプです: ${geometry.type}（Point または Polygon を指定してください）`,
        };
      }
      return { success: true, aoi };
    }

    // Geometry 直接
    if (obj.type === "Point" || obj.type === "Polygon") {
      const aoi = parseGeometry(obj);
      if (!aoi) {
        return { success: false, error: "座標の形式が不正です" };
      }
      return { success: true, aoi };
    }

    return {
      success: false,
      error: `非対応の GeoJSON タイプです: ${String(obj.type)}`,
    };
  } catch {
    return { success: false, error: "GeoJSON の解析に失敗しました" };
  }
}
