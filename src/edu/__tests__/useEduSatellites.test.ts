import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOM_SATELLITE_ID } from "../../lib/edu/custom-orbit";
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sample-tle.json の順序で10機を返す", () => {
    const { result } = renderHook(() => useEduSatellites());
    expect(result.current.satellites).toHaveLength(10);
    expect(result.current.satellites.map((satellite) => satellite.id)).toEqual(ALL_IDS);
  });

  it("Phase3 向けの衛星グループ配列を返す", () => {
    const { result } = renderHook(() => useEduSatellites());

    expect(result.current.allEduSatellites).toHaveLength(10);
    expect(result.current.opticalSatellites.map((satellite) => satellite.id)).toEqual([
      "sentinel2a",
      "sentinel2b",
      "worldview3",
    ]);
    expect(result.current.sarSatellites.map((satellite) => satellite.id)).toEqual([
      "sentinel1a",
      "sentinel1b",
      "terrasar",
      "tandemx",
      "capella",
      "iceye",
    ]);
  });

  it("衛星選択を切り替える", () => {
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.selectSatellite("worldview3");
    });

    expect(result.current.selectedSatelliteId).toBe("worldview3");
    expect(result.current.selectedSatellite?.displayName).toBe("ワールドビュー3");
  });

  it("同じ衛星を再選択しても選択イベントを再発火できる", () => {
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.selectSatellite("worldview3");
    });
    const firstNonce = result.current.selectionNonce;

    act(() => {
      result.current.selectSatellite("worldview3");
    });

    expect(result.current.selectedSatelliteId).toBe("worldview3");
    expect(result.current.selectionNonce).toBeGreaterThan(firstNonce);
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

  it("ドラフト変更は打ち上げ済み状態を即時変更しない", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 2, 6, 10, 0, 0));
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.launchCustomSatellite();
    });

    const launchedAltitude = result.current.launchedCustomSatellite?.altitudeKm;

    act(() => {
      result.current.updateDraft({ altitudeKm: 1800 });
    });

    expect(result.current.customDraft.altitudeKm).toBe(1800);
    expect(result.current.launchedCustomSatellite?.altitudeKm).toBe(launchedAltitude);
  });

  it("打ち上げ時に自作衛星を選択し、指標を確定する", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 2, 6, 12, 0, 0));
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.updateDraft({ altitudeKm: 1200, inclinationDeg: 80, cameraMode: "wide" });
    });

    act(() => {
      result.current.launchCustomSatellite();
    });

    expect(result.current.selectedSatelliteId).toBe(CUSTOM_SATELLITE_ID);
    expect(result.current.launchedCustomSatellite).not.toBeNull();
    expect(result.current.launchedCustomSatellite?.altitudeKm).toBe(1200);
    expect(result.current.launchedCustomSatellite?.cameraMode).toBe("wide");
    expect(result.current.launchedCustomSatellite?.orbitsPerDay).toBeGreaterThan(0);
    expect(result.current.launchedCustomSatellite?.japanPassesPerDay).toBeGreaterThanOrEqual(0);
  });

  it("自作衛星詳細モーダルを開ける", () => {
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.openDetails(CUSTOM_SATELLITE_ID);
    });

    expect(result.current.customDetailOpen).toBe(true);
    expect(result.current.detailSatellite).toBeNull();
  });
});
