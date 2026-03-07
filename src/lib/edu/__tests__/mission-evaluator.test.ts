import { describe, expect, it } from "vitest";
import { PHASE4_MISSION_DEFINITIONS } from "../../../edu/data/mission-definitions";
import { evaluateMission } from "../mission-evaluator";

function getMission(missionId: (typeof PHASE4_MISSION_DEFINITIONS)[number]["id"]) {
  const mission = PHASE4_MISSION_DEFINITIONS.find((item) => item.id === missionId);
  if (!mission) {
    throw new Error(`missing mission definition: ${missionId}`);
  }
  return mission;
}

describe("mission-evaluator", () => {
  it("ミッション1: 日本全体を同時にカバーできる設計で成功", () => {
    const mission = getMission("cover-japan-day");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 35786, inclinationDeg: 0, cameraMode: "wide" },
      launchedCustomSatellite: {
        altitudeKm: 35786,
        inclinationDeg: 0,
        cameraMode: "wide",
        launchEpochMs: Date.UTC(2026, 2, 7, 4, 0, 0),
        orbitPeriodMin: 1436,
        speedKmS: 3.1,
        orbitsPerDay: 1,
        japanPassesPerDay: 1,
        footprintFovDeg: 18,
      },
      discoveryState: null,
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("ミッション1: 日本全体を覆えない設計では失敗理由を返す", () => {
    const mission = getMission("cover-japan-day");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 700, inclinationDeg: 40, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 700,
        inclinationDeg: 40,
        cameraMode: "detail",
        launchEpochMs: Date.UTC(2026, 2, 7, 4, 0, 0),
        orbitPeriodMin: 98,
        speedKmS: 7.5,
        orbitsPerDay: 14,
        japanPassesPerDay: 3,
        footprintFovDeg: 6,
      },
      discoveryState: null,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      "camera-mode",
      "insufficient-coverage",
    ]);
  });

  it("ミッション2: detail + altitude<=900 + passes>=5 で成功", () => {
    const mission = getMission("rapid-disaster-response");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 850, inclinationDeg: 80, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 850,
        inclinationDeg: 80,
        cameraMode: "detail",
        launchEpochMs: 0,
        orbitPeriodMin: 102,
        speedKmS: 7.2,
        orbitsPerDay: 13,
        japanPassesPerDay: 5,
        footprintFovDeg: 6,
      },
      discoveryState: null,
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("ミッション2: 高度超過と通過回数不足を検出する", () => {
    const mission = getMission("rapid-disaster-response");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 1200, inclinationDeg: 70, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 1200,
        inclinationDeg: 70,
        cameraMode: "detail",
        launchEpochMs: 0,
        orbitPeriodMin: 110,
        speedKmS: 6.9,
        orbitsPerDay: 12,
        japanPassesPerDay: 3,
        footprintFovDeg: 6,
      },
      discoveryState: null,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      "altitude-too-high",
      "insufficient-passes",
    ]);
  });

  it("ミッション3: discoveryゲーム完了で成功、未完了で失敗", () => {
    const mission = getMission("target-discovery");
    const baseDraft = { altitudeKm: 700, inclinationDeg: 60, cameraMode: "wide" as const };
    const baseCtx = {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: baseDraft,
      launchedCustomSatellite: null,
    };

    const completeResult = evaluateMission(mission, {
      ...baseCtx,
      discoveryState: {
        step: "complete",
        scenario: { creature: { id: "x", emoji: "", nameJa: "", descriptionJa: "" }, location: { id: "y", nameJa: "", lonDeg: 0, latDeg: 0, radiusKm: 100, terrainSeed: 1 }, decoyCreatures: [] },
        wideScanSatelliteId: "sentinel2a",
        detailScanSatelliteId: "worldview3",
        identifiedCreatureId: "x",
        wideScanImageUrl: null,
        detailScanImageUrl: null,
      },
    });
    expect(completeResult.passed).toBe(true);

    const incompleteResult = evaluateMission(mission, {
      ...baseCtx,
      discoveryState: null,
    });
    expect(incompleteResult.passed).toBe(false);
    expect(incompleteResult.reasons[0]?.code).toBe("discovery-not-complete");
  });
});
