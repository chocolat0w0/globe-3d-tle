import { describe, it, expect } from "vitest";
import { parseAoiFromGeoJSON } from "../geojson-parser";
import type { AoiPoint, AoiPolygon } from "../../../types/polygon";

describe("parseAoiFromGeoJSON", () => {
  describe("Feature<Point>", () => {
    it("正常なポイントフィーチャを解析できる", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.6917, 35.6895] },
        properties: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.aoi).toEqual<AoiPoint>({
          type: "Point",
          coordinate: [139.6917, 35.6895],
        });
      }
    });

    it("負の経度・緯度を正しく解析できる", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "Point", coordinates: [-73.935, 40.73] },
        properties: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.aoi as AoiPoint).coordinate).toEqual([-73.935, 40.73]);
      }
    });
  });

  describe("Feature<Polygon>", () => {
    const ring = [
      [130, 30],
      [140, 30],
      [140, 40],
      [130, 40],
      [130, 30],
    ];

    it("正常なポリゴンフィーチャを解析できる", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const aoi = result.aoi as AoiPolygon;
        expect(aoi.type).toBe("Polygon");
        expect(aoi.coordinates).toHaveLength(5);
        expect(aoi.coordinates[0]).toEqual([130, 30]);
      }
    });

    it("内輪（ホール）は無視して外輪のみを採用する", () => {
      const hole = [[131, 31], [139, 31], [139, 39], [131, 39], [131, 31]];
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring, hole] },
        properties: {},
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // 内輪は含まれず外輪の点数だけ
        expect((result.aoi as AoiPolygon).coordinates).toHaveLength(ring.length);
      }
    });
  });

  describe("FeatureCollection", () => {
    it("最初のフィーチャを採用する", () => {
      const result = parseAoiFromGeoJSON({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [100, 20] },
            properties: {},
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [200, 99] },
            properties: {},
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.aoi as AoiPoint).coordinate).toEqual([100, 20]);
      }
    });

    it("features が空なら success: false", () => {
      const result = parseAoiFromGeoJSON({
        type: "FeatureCollection",
        features: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Geometry 直接渡し", () => {
    it("Point Geometry を直接解析できる", () => {
      const result = parseAoiFromGeoJSON({
        type: "Point",
        coordinates: [135, 35],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.aoi as AoiPoint).coordinate).toEqual([135, 35]);
      }
    });

    it("Polygon Geometry を直接解析できる", () => {
      const result = parseAoiFromGeoJSON({
        type: "Polygon",
        coordinates: [[[130, 30], [140, 30], [140, 40], [130, 30]]],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("エラーケース", () => {
    it("null を渡すと success: false", () => {
      const result = parseAoiFromGeoJSON(null);
      expect(result.success).toBe(false);
    });

    it("文字列を渡すと success: false", () => {
      const result = parseAoiFromGeoJSON("not an object");
      expect(result.success).toBe(false);
    });

    it("未対応タイプ（LineString）は success: false", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
        properties: {},
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Point または Polygon");
      }
    });

    it("未対応タイプ（MultiPolygon）は success: false", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "MultiPolygon", coordinates: [] },
        properties: {},
      });
      expect(result.success).toBe(false);
    });

    it("geometry が null の Feature は success: false", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: null,
        properties: {},
      });
      expect(result.success).toBe(false);
    });

    it("Polygon の外輪が 2 点以下なら success: false", () => {
      const result = parseAoiFromGeoJSON({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[130, 30], [140, 40]]] },
        properties: {},
      });
      expect(result.success).toBe(false);
    });

    it("知らない type 文字列は success: false", () => {
      const result = parseAoiFromGeoJSON({ type: "Unknown" });
      expect(result.success).toBe(false);
    });
  });
});
