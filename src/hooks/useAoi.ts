import { useState, useCallback } from "react";
import type { Aoi, AoiDrawingMode } from "../types/polygon";
import { parseAoiFromGeoJSON } from "../lib/aoi/geojson-parser";

type LoadResult =
  | { success: true; aoi: Aoi }
  | { success: false; error: string };

export function useAoi() {
  const [aoi, setAoiState] = useState<Aoi | null>(null);
  const [mode, setMode] = useState<AoiDrawingMode>("none");

  const setAoi = useCallback((newAoi: Aoi) => {
    setAoiState(newAoi);
    setMode("none");
  }, []);

  const clearAoi = useCallback(() => {
    setAoiState(null);
    setMode("none");
  }, []);

  const loadFromGeoJSON = useCallback((json: unknown): LoadResult => {
    const result = parseAoiFromGeoJSON(json);
    if (result.success) {
      setAoiState(result.aoi);
      setMode("none");
    }
    return result;
  }, []);

  return { aoi, mode, setMode, setAoi, clearAoi, loadFromGeoJSON };
}
