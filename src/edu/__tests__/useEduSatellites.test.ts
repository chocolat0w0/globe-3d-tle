import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEduSatellites } from "../hooks/useEduSatellites";

const ALL_IDS = [
  "sentinel1a",
  "sentinel1b",
  "terrasar",
  "tandemx",
  "capella",
  "iceye",
  "sentinel2a",
  "sentinel2b",
  "worldview3",
  "himawari",
];

describe("useEduSatellites", () => {
  it("sample-tle.json の順序で10機を返す", () => {
    const { result } = renderHook(() => useEduSatellites());
    expect(result.current.satellites).toHaveLength(10);
    expect(result.current.satellites.map((satellite) => satellite.id)).toEqual(ALL_IDS);
  });

  it("衛星選択を切り替える", () => {
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.selectSatellite("worldview3");
    });

    expect(result.current.selectedSatelliteId).toBe("worldview3");
    expect(result.current.selectedSatellite?.displayName).toBe("ワールドビュー3");
  });

  it("詳細モーダル対象の開閉を管理する", () => {
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.openDetails("himawari");
    });

    expect(result.current.selectedSatelliteId).toBe("himawari");
    expect(result.current.detailSatellite?.displayName).toBe("ひまわり8号");

    act(() => {
      result.current.closeDetails();
    });

    expect(result.current.detailSatellite).toBeNull();
  });
});
