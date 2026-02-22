import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAoi } from "../useAoi";
import type { AoiPoint, AoiPolygon } from "../../types/polygon";

describe("useAoi", () => {
  it("初期状態: aoi が null、mode が none", () => {
    const { result } = renderHook(() => useAoi());
    expect(result.current.aoi).toBeNull();
    expect(result.current.mode).toBe("none");
  });

  it("setMode('point') でモードが変わる", () => {
    const { result } = renderHook(() => useAoi());
    act(() => result.current.setMode("point"));
    expect(result.current.mode).toBe("point");
  });

  it("setMode('polygon') でモードが変わる", () => {
    const { result } = renderHook(() => useAoi());
    act(() => result.current.setMode("polygon"));
    expect(result.current.mode).toBe("polygon");
  });

  it("setAoi() でAOIが設定され、モードが none に戻る", () => {
    const { result } = renderHook(() => useAoi());
    act(() => result.current.setMode("point"));
    const point: AoiPoint = { type: "Point", coordinate: [139.6917, 35.6895] };
    act(() => result.current.setAoi(point));
    expect(result.current.aoi).toEqual(point);
    expect(result.current.mode).toBe("none");
  });

  it("clearAoi() で aoi が null になり、モードも none になる", () => {
    const { result } = renderHook(() => useAoi());
    const point: AoiPoint = { type: "Point", coordinate: [139.6917, 35.6895] };
    act(() => result.current.setAoi(point));
    act(() => result.current.setMode("polygon"));
    act(() => result.current.clearAoi());
    expect(result.current.aoi).toBeNull();
    expect(result.current.mode).toBe("none");
  });

  describe("loadFromGeoJSON", () => {
    it("Feature<Point> を読み込んで AoiPoint を返す", () => {
      const { result } = renderHook(() => useAoi());
      const geojson = {
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.69, 35.68] },
        properties: {},
      };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geojson);
      });
      expect(ret).toBeDefined();
      if (!ret || !ret.success) {
        throw new Error("Expected loadFromGeoJSON to succeed");
      }
      expect(ret.aoi).toEqual<AoiPoint>({
        type: "Point",
        coordinate: [139.69, 35.68],
      });
      expect(result.current.aoi).not.toBeNull();
      expect(result.current.mode).toBe("none");
    });

    it("Feature<Polygon> を読み込んで AoiPolygon を返す", () => {
      const { result } = renderHook(() => useAoi());
      const ring = [
        [130, 30],
        [140, 30],
        [140, 40],
        [130, 40],
        [130, 30],
      ];
      const geojson = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {},
      };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geojson);
      });
      expect(ret).toBeDefined();
      if (!ret || !ret.success) {
        throw new Error("Expected loadFromGeoJSON to succeed");
      }
      const aoi = ret.aoi as AoiPolygon;
      expect(aoi.type).toBe("Polygon");
      expect(aoi.coordinates).toHaveLength(5);
    });

    it("FeatureCollection の最初のフィーチャを処理できる", () => {
      const { result } = renderHook(() => useAoi());
      const geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [100, 20] },
            properties: {},
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [999, 999] },
            properties: {},
          },
        ],
      };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geojson);
      });
      expect(ret).toBeDefined();
      if (!ret || !ret.success) {
        throw new Error("Expected loadFromGeoJSON to succeed");
      }
      expect((ret.aoi as AoiPoint).coordinate).toEqual([100, 20]);
    });

    it("Geometry を直接渡しても解析できる", () => {
      const { result } = renderHook(() => useAoi());
      const geometry = { type: "Point", coordinates: [135, 35] };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geometry);
      });
      expect(ret).toBeDefined();
      expect(ret?.success).toBe(true);
    });

    it("不正なオブジェクトを渡すと success: false を返す", () => {
      const { result } = renderHook(() => useAoi());
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON({ type: "Unknown" });
      });
      expect(ret).toBeDefined();
      expect(ret?.success).toBe(false);
      expect(result.current.aoi).toBeNull();
    });

    it("未対応の geometry タイプ（LineString）を渡すと success: false を返す", () => {
      const { result } = renderHook(() => useAoi());
      const geojson = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [[130, 30], [140, 40]],
        },
        properties: {},
      };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geojson);
      });
      expect(ret).toBeDefined();
      if (!ret || ret.success) {
        throw new Error("Expected loadFromGeoJSON to fail");
      }
      expect(ret.error).toContain("Point または Polygon");
    });

    it("null を渡すと success: false を返す", () => {
      const { result } = renderHook(() => useAoi());
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(null);
      });
      expect(ret).toBeDefined();
      expect(ret?.success).toBe(false);
    });

    it("FeatureCollection にフィーチャが空の場合 success: false を返す", () => {
      const { result } = renderHook(() => useAoi());
      const geojson = { type: "FeatureCollection", features: [] };
      let ret: ReturnType<typeof result.current.loadFromGeoJSON> | undefined;
      act(() => {
        ret = result.current.loadFromGeoJSON(geojson);
      });
      expect(ret).toBeDefined();
      expect(ret?.success).toBe(false);
    });
  });
});
